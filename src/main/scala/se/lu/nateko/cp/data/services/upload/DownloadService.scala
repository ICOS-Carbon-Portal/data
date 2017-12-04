package se.lu.nateko.cp.data.services.upload

import scala.collection.immutable
import scala.concurrent.ExecutionContext
import scala.util.Failure
import scala.util.Success

import akka.NotUsed
import akka.event.LoggingAdapter
import akka.stream.SourceShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Concat
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.ConfigReader
import se.lu.nateko.cp.data.streams.ZipEntryFlow
import se.lu.nateko.cp.data.streams.ZipEntryFlow.FileEntry
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.meta.core.data.Envri

class DownloadService(upload: UploadService, log: LoggingAdapter)(implicit ctxt: ExecutionContext) {

	import DownloadService._

	private val coreConf = ConfigReader.metaCore
	//TODO Generalize for multiple ENVRIes
	private val envriConf = coreConf.envriConfigs(Envri.ICOS)

	def getZipSource(hashes: Seq[Sha256Sum], downloadLogger: DataObject => Unit) = {

		val destiniesSource: Source[FileDestiny, NotUsed] = Source(hashes.toList)
			.flatMapConcat{
				hash => Source.fromFuture(
					upload.lookupPackage(hash).andThen{
						case Failure(err) =>
							log.error(err, s"Could not retrieve metadata for ${hash.id}")
					}
				)
			}
			.scan[Destiny](ZeroDestiny){(dest, dobj) =>
				new FileDestiny(dobj, dest.fileNamesUsed)
			}.collect{
				case fd: FileDestiny => fd
			}

		val destinyToDobjSourcesFlow: Flow[FileDestiny, FileEntry, NotUsed] = Flow.apply[FileDestiny]
			.filter(fd => fd.omissionReason.isEmpty)
			.map(fd => (fd.fileName, singleObjectSource(fd.dobj, downloadLogger)))

		val sourcesSource = GraphDSL.create(){implicit b =>
			import GraphDSL.Implicits._

			val split = b.add(Broadcast[FileDestiny](2))
			val concat = b.add(Concat[FileEntry]())

			destiniesSource ~> split.in

			split.out(0) ~> destinyToDobjSourcesFlow ~> concat.in(0)
			split.out(1) ~> destinyToAuxSourcesFlow ~> concat.in(1)
			SourceShape(concat.out)
		}
		ZipEntryFlow.getMultiEntryZipStream(Source.fromGraph(sourcesSource))
	}

	private val licenceSource = StreamConverters.fromInputStream(
		() => getClass.getClassLoader.getResourceAsStream("licence.pdf")
	)

	private val destinyToAuxSourcesFlow: Flow[FileDestiny, FileEntry, NotUsed] = Flow.apply[FileDestiny]
		.fold(Vector.empty[FileDestiny])(_ :+ _)
		.map{dests =>
			("!TOC.csv", destiniesToTocFileSource(dests))
		}.concat(Source.single(
			("!LICENCE.pdf", licenceSource)
		))

	private def singleObjectSource(dobj: DataObject, downloadLogger: DataObject => Unit): Source[ByteString, NotUsed] = {
		val file = upload.getFile(dobj)

		val src = FileIO.fromPath(file.toPath).mapMaterializedValue(_.map(_.count))


		src.mapMaterializedValue(f => {
			f.onComplete{
				case Success(_) => downloadLogger(dobj)
				case Failure(err) => log.error(err, s"Access error for object ${dobj.hash.id} (${dobj.fileName})")
			}
			NotUsed
		})
	}

	private def destiniesToTocFileSource(dests: immutable.Seq[FileDestiny]): Source[ByteString, NotUsed] = {
		val lines = "Included,File name,PID,Landing page,Omission reason (if any)\n" +: dests.map{dest =>

			val presense = if(dest.omissionReason.isEmpty) "Yes" else "No"
			val omissionReason = dest.omissionReason.getOrElse("")
			val pid = dest.dobj.pid.getOrElse("")
			val landingPage = dest.dobj.pid.fold(
				envriConf.landingPagePrefix + dest.dobj.hash.id
			)(
				pid => s"${coreConf.handleService}$pid"
			)
			s"$presense,${dest.fileName},$pid,$landingPage,$omissionReason\n"
		}
		Source(lines.map(ByteString.apply))
	}

	private class FileDestiny(val dobj: DataObject, fileNamesUsedEarlier: Set[String]) extends Destiny{

		val omissionReason: Option[String] = dobj.accessUrl match {
			case None =>
				Some("Data object is not distributed by Carbon Portal as open data")

			case Some(url) =>
				if(!url.toString.startsWith(envriConf.dataObjPrefix.toString))
					Some("Data object is distributed by third parties")

				else if(!upload.getFile(dobj).exists)
					Some("File is missing on the server")
				else
					None
		}

		val fileName = if(omissionReason.isDefined) dobj.fileName else {

			val uniquifyingIndex = Iterator.from(0).dropWhile{idx =>
				val attemptName = makeFileName(dobj.fileName, idx)
				fileNamesUsedEarlier.contains(attemptName)
			}.next()

			makeFileName(dobj.fileName, uniquifyingIndex)
		}

		val fileNamesUsed: Set[String] =
			if(omissionReason.isDefined) fileNamesUsedEarlier
			else fileNamesUsedEarlier + fileName
	}
}

private sealed trait Destiny{
	def omissionReason: Option[String]
	def fileNamesUsed: Set[String]
}

private object ZeroDestiny extends Destiny{
	def omissionReason = None
	def fileNamesUsed = Set.empty
}

object DownloadService{

	def makeFileName(base: String, idx: Int): String =
		if(idx == 0) base
		else if(!base.contains('.')) s"$base($idx)"
		else {
			val segms = base.split('.')
			segms.dropRight(1).mkString("", ".", s"($idx).${segms.last}")
		}
}
