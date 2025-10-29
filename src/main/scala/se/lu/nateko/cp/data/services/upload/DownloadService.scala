package se.lu.nateko.cp.data.services.upload

import akka.NotUsed
import akka.stream.SourceShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Concat
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.api.CcMetaVocab
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.api.RestHeartClient
import se.lu.nateko.cp.data.api.SitesMetaVocab
import se.lu.nateko.cp.data.api.dataFail
import se.lu.nateko.cp.data.streams.ZipEntryFlow
import se.lu.nateko.cp.data.streams.ZipEntryFlow.FileEntry
import se.lu.nateko.cp.data.utils.io.hostL2
import se.lu.nateko.cp.data.utils.io.takeL2Domain
import se.lu.nateko.cp.meta.core.MetaCoreConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.DocObject
import se.lu.nateko.cp.meta.core.data.StaticObject
import se.lu.nateko.cp.meta.core.data.staticObjLandingPage

import java.net.URI
import java.time.Instant
import java.util.zip.ZipEntry
import scala.collection.immutable
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success
import eu.icoscp.envri.Envri

class DownloadService(coreConf: MetaCoreConfig, val upload: UploadService, val restHeart: RestHeartClient)(using ExecutionContext):

	import DownloadService._

	def log = upload.log
	private def envriConf(implicit envri: Envri) = coreConf.envriConfigs(envri)

	def getZipSource(hashes: Seq[Sha256Sum], downloadLogger: DataObject => Unit)(implicit envri: Envri) = {

		val destiniesSource: Source[FileDestiny, NotUsed] = Source(hashes.toList)
			.flatMapConcat{
				hash => Source.future(
					upload.meta.lookupObject(hash).andThen{
						case Failure(err) =>
							log.error(err, s"Could not retrieve metadata for ${hash.id}")
					}
				)
			}
			.scan[Destiny](ZeroDestiny){(dest, obj) =>
				new FileDestiny(obj, dest.fileNamesUsed)
			}.collect{
				case fd: FileDestiny => fd
			}

		val destinyToDobjSourcesFlow: Flow[FileDestiny, FileEntry, NotUsed] = Flow.apply[FileDestiny]
			.filter(fd => fd.omissionReason.isEmpty)
			.map(fd => destToZentry(fd) -> singleObjectSource(fd.obj, downloadLogger))

		val sourcesSource = GraphDSL.create(){implicit b =>
			import GraphDSL.Implicits._

			val split = b.add(Broadcast[FileDestiny](2))
			val concat = b.add(Concat[FileEntry]())

			destiniesSource ~> split.in

			split.out(0) ~> destinyToDobjSourcesFlow ~> concat.in(0)
			split.out(1) ~> destinyToAuxSourcesFlow ~> concat.in(1)
			SourceShape(concat.out)
		}
		ZipEntryFlow.getMultiEntryZipStream(Source.fromGraph(sourcesSource), Some(0))
	}

	def licenceToAccept(dobj: DataObject, uidOpt: Option[UserId])(using Envri): Future[Option[URI]] = {
		val toAccept: Option[URI] = dobj.references.licence.map(_.url)
			.filterNot(publicDomainLicences.contains)

		toAccept.fold(Future.successful(None)){lic =>
			checkLicenceAcceptance(lic, uidOpt).map{
				if(_) None else Some(lic)
			}
		}
	}

	def licencesToAccept(hashes: Seq[Sha256Sum], uidOpt: Option[UserId])(using envri: Envri): Future[Seq[URI]] = {
		mainLicences.get(envri)
			.map { mainLicence =>
				upload.meta.listLicences(hashes).flatMap { allLicences =>
					if (allLicences.contains(mainLicence)) {
						checkLicenceAcceptance(mainLicence, uidOpt).map { accepted =>
							if (accepted) Seq.empty else Seq(mainLicence)
						}
						} else {
							Future.successful(Seq.empty)
						}
				}
			}.getOrElse(Future.successful(Seq.empty))
	}

	def inaccessibilityReason(dobj: StaticObject)(using Envri): Option[String] =
		new FileDestiny(dobj, Set.empty).omissionReason

	private def checkLicenceAcceptance(lic: URI, uidOpt: Option[UserId])(using envri: Envri): Future[Boolean] = uidOpt
		.fold(Future.successful(false)){uid =>
			mainLicences.get(envri) match{
				case Some(`lic`) => restHeart.getUserLicenseAcceptance(uid)
				case Some(_) => dataFail(s"Missing support for checking licence compliance for licence $lic")
				case None => dataFail(s"Missing support for checking licence compliance for ENVRI $envri")
			}
			
		}

	private def licenceSource(implicit envri: Envri) = StreamConverters.fromInputStream{() =>
		val fileName = s"${envri}-licence.pdf"
		val stream = getClass.getClassLoader.getResourceAsStream(fileName)
		if stream == null then
			throw CpDataException(s"File $fileName is not included in the server deployment package")
		else stream
	}

	private def destinyToAuxSourcesFlow(implicit envri: Envri): Flow[FileDestiny, FileEntry, NotUsed] = Flow.apply[FileDestiny]
		.fold(Vector.empty[FileDestiny])(_ :+ _)
		.flatMapConcat{dests =>
			val baseSource = Source.single(ZipEntry("!TOC.csv") -> destiniesToTocFileSource(dests))

			val shouldIncludeLincensePdf = dests.exists(
				_.obj.references.licence.exists(
					_.toString().contains("creativecommons.org/licenses/by/4.0")
				)
			)

			if (shouldIncludeLincensePdf) {
				baseSource.concat(Source.single(ZipEntry("!LICENCE.pdf") -> licenceSource))
			} else {
				baseSource
			}
		}

	private def singleObjectSource(obj: StaticObject, downloadLogger: DataObject => Unit): Source[ByteString, NotUsed] = {
		val file = upload.getFile(obj, true)

		val src = FileIO.fromPath(file.toPath).mapMaterializedValue(_.map(_.count))


		src.mapMaterializedValue(f => {
			f.onComplete{
				case Success(_) => obj.asDataObject.foreach(downloadLogger)
				case Failure(err) => log.error(err, s"Access error for object ${obj.hash.id} (${obj.fileName})")
			}
			NotUsed
		})
	}

	private def destiniesToTocFileSource(dests: immutable.Seq[FileDestiny])(using Envri): Source[ByteString, NotUsed] = {
		val lines = "Included,File name,PID,Landing page,License,Omission reason (if any)\n" +: dests.map{dest =>

			val presense = if(dest.omissionReason.isEmpty) "Yes" else "No"
			val omissionReason = dest.omissionReason.getOrElse("")
			val pidOpt = dest.obj.doi.orElse(dest.obj.pid)
			val landingPage = pidOpt.fold(
				staticObjLandingPage(dest.obj.hash)(using envriConf).toString
			){
				pid =>
				import coreConf.{handleProxies => prox}
				val hdlProxy = if(dest.obj.doi.isDefined) prox.doi else prox.basic
				s"$hdlProxy$pid"
			}
			val license = dest.obj.references.licence.fold("")(_.name)
			s"$presense,${dest.fileName},${pidOpt.getOrElse("")},$landingPage,$license,$omissionReason\n"
		}
		Source(lines.map(ByteString.apply))
	}

	private class FileDestiny(val obj: StaticObject, fileNamesUsedEarlier: Set[String])(using envri: Envri) extends Destiny:
		val omissionReason: Option[String] =
			if(obj.size.isEmpty)
				Some("Uploading of this object has not been completed.")

			else if(obj.submission.stop.exists(_.compareTo(Instant.now()) > 0))
				Some(s"Data object is under moratorium, will be available at ${obj.submission.stop.getOrElse("?")}")

			else obj.accessUrl match {

				case None =>
					Some(s"Data object is not distributed by the Data Portal due to $envri policies")

				case Some(url) =>
					if(url.hostL2 != takeL2Domain(envriConf.dataHost))
						Some("Data object is distributed by third parties")

					else if(!upload.getFile(obj, true).exists)
						Some("File with object contents is missing on the server")
					else
						None
			}

		val fileName = if(omissionReason.isDefined) obj.fileName else {

			val uniquifyingIndex = Iterator.from(0).dropWhile{idx =>
				val attemptName = makeFileName(obj.fileName, idx)
				fileNamesUsedEarlier.contains(attemptName)
			}.next()

			makeFileName(obj.fileName, uniquifyingIndex)
		}

		val fileNamesUsed: Set[String] =
			if(omissionReason.isDefined) fileNamesUsedEarlier
			else fileNamesUsedEarlier + fileName

	end FileDestiny

	private def destToZentry(dest: FileDestiny): ZipEntry =
		val zentry = ZipEntry(dest.fileName)
		zentry.setTime(dest.obj.submission.start.toEpochMilli)
		dest.obj.size.foreach(zentry.setSize)
		zentry

end DownloadService

private sealed trait Destiny{
	def omissionReason: Option[String]
	def fileNamesUsed: Set[String]
}

private object ZeroDestiny extends Destiny{
	def omissionReason = None
	def fileNamesUsed = Set.empty
}

object DownloadService:

	val publicDomainLicences = Set(CcMetaVocab.cc0, CcMetaVocab.ccbync4)

	val mainLicences: Map[Envri, URI] = Map(
		Envri.ICOS -> CpMetaVocab.ccby4,
		Envri.SITES -> SitesMetaVocab.ccby4,
		Envri.ICOSCities -> CpMetaVocab.ccby4
	)

	def makeFileName(base: String, idx: Int): String =
		if(idx == 0) base
		else if(!base.contains('.')) s"$base($idx)"
		else {
			val segms = base.split('.')
			segms.dropRight(1).mkString("", ".", s"($idx).${segms.last}")
		}
