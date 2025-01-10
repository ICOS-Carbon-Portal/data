package se.lu.nateko.cp.data.test.api

import akka.Done
import akka.NotUsed
import akka.actor.ActorSystem
import akka.actor.Scheduler
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.ConfigReader
import se.lu.nateko.cp.data.api.*
import se.lu.nateko.cp.data.services.upload.IrodsUploadTask
import se.lu.nateko.cp.data.services.upload.UploadTaskResult
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import java.net.URI
import java.nio.charset.StandardCharsets
import java.nio.file.Path
import java.nio.file.Paths
import scala.concurrent.Await
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

object B2Playground:
	case class MoveRequest(from: IrodsData, to: IrodsData)
	type MoveAction = (IrodsColl, Seq[MoveRequest])

	private given system: ActorSystem = ActorSystem("B2StageClient")
	system.log
	given ExecutionContextExecutor = system.dispatcher
	given Scheduler = system.scheduler
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()

	val uplConfig = ConfigReader.getDefault.upload
	//val b2config = uplConfig.b2safe.copy(dryRun = false)
	val irodsConfig = uplConfig.irods.copy(dryRun = false)
	//val default = new B2SafeClient(b2config, http)
	val default = new IRODSClient(irodsConfig, http)

	def list(path: String, parent: Option[IrodsColl] = Some(IrodsItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)
	}

	def listRoot() =
		val items = Await.result(default.list(IrodsItem.Root), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)


	def countItems(path: String, parent: Option[IrodsColl] = Some(IrodsItem.Root)): Future[Int] =
		default.list(IrodsColl(path, parent)).map:
			//_.runFold(0)((sum, _) => sum + 1)
			_.size


	def testUpload(name: String, nMb: Long, viaSink: Boolean, parent: IrodsColl = IrodsItem.Root) =
		val mb = ByteString(Array.ofDim[Byte](1 << 20))
		val dobj = IrodsData(name, parent)

		val src = Source.repeat(mb).take(nMb)//.delay(200.milli, OverflowStrategy.backpressure)

		if viaSink then
			src.runWith(default.objectSink(dobj))
		else
			default.uploadObject(dobj, src)

	def uploadFile(filePath: String, parent: IrodsColl = IrodsItem.Root): Future[Seq[(Long, Int)]] =
		val file = Paths.get(filePath)
		val dobj = IrodsData(file.getFileName.toString, parent)
		default.uploadObject(dobj, FileIO.fromPath(file))

	def uploadToCitiesThroughTask(filePath: String, formatSuffix: String): Future[UploadTaskResult] =
		given Envri = Envri.ICOSCities
		val path = Paths.get(filePath)
		FileIO.fromPath(path).viaMat(DigestFlow.sha256)(Keep.right).to(Sink.ignore).run().flatMap: hash =>
			val formatUri = URI(s"https://meta.icos-cp.eu/resources/$formatSuffix")
			val task = IrodsUploadTask(Some(formatUri), hash, default)
			FileIO.fromPath(path).runWith(task.sink)

	def deleteFile(name: String, parent: IrodsColl = IrodsItem.Root): Unit =
		awaitAndReport(default.delete(IrodsData(name, parent))): (done, ms) =>
			println(s"File deleted in $ms ms")

	def parWriteShutdown(handle: String): Future[Done] =
		default.parWriteShutdown(IRODSClient.ParWriteHandle(handle))

	def downloadFile(targetPath: String, name: String, parent: IrodsColl = IrodsItem.Root): Unit =
		val doneFut = default.downloadObject(IrodsData(name, parent)).flatMap: src =>
			src.runWith(FileIO.toPath(Paths.get(targetPath)))
		awaitAndReport(doneFut): (res, ms) =>
			println(s"$res , done in $ms ms")

	def getHashsum(name: String, parent: IrodsColl = IrodsItem.Root): Unit =
		awaitAndReport(default.getHashsum(IrodsData(name, parent))): (hash, ms) =>
			println(s"Hash $hash, elapsed $ms ms")

	def testDownload(name: String, parent: IrodsColl = IrodsItem.Root): Unit =
		val lfut = default.downloadObject(IrodsData(name, parent)).flatMap(
			_.runFold(0L)((sum, bs) => {/*println(sum);*/ sum + bs.length})
		)
		awaitAndReport(lfut): (size, ms) =>
			println(s"Size $size, elapsed $ms ms")


	def awaitAndReport[T](fut: Future[T])(reporterMs: (T, Long) => Unit): Unit =
		val start = System.currentTimeMillis
		val res = Await.result(fut, 60.minutes)
		val elapsed = System.currentTimeMillis - start
		reporterMs(res, elapsed)

	def testMove(name: String, parentFrom: IrodsColl, parentTo: IrodsColl) =
		inline def data(coll: IrodsColl) = IrodsData(name, coll)
		default.moveObject(data(parentFrom), data(parentTo))

	def testRename(fromName: String, toName: String, parent: IrodsColl) =
		inline def data(name: String) = IrodsData(name, parent)
		default.moveObject(data(fromName), data(toName))

	def mergeMove(from: IrodsColl, to: IrodsColl): Source[MoveAction, Any] =
		val presentInTarget: Future[Set[IrodsData]] =
			Source.future(listContentsAsColls(to))
				.mapConcat(identity)
				.mapAsyncUnordered(5)(listContentsAsObjs)
				.mapConcat(identity)
				.runWith(Sink.seq)
				.map(_.toSet)

		def srcFut: Future[Source[MoveAction, NotUsed]] = presentInTarget.map: present =>
			Source.future(listContentsAsColls(from))
				.mapConcat(identity)
				.mapAsyncUnordered(5): coll =>
					listContentsAsObjs(coll).map: dobjs =>
						val targetColl = coll.copy(parent = Some(to))
						val requests = dobjs
							.map: orig =>
								MoveRequest(orig, orig.copy(parent = targetColl))
							.filterNot(req => present.contains(req.to))
						(targetColl, requests)
				.filterNot:
					(_, requests) => requests.isEmpty

		Source.lazyFutureSource(() => srcFut)
	end mergeMove

	// Assuming that coll has only one level of sub colls, and that there are no data files directly below coll.
	def listContentsAsColls(coll: IrodsColl): Future[Seq[IrodsColl]] =
		parseCollContents(coll, IrodsColl(_, Some(coll)))

	// Assuming that coll has no sub colls, only data (files).
	def listContentsAsObjs(coll: IrodsColl): Future[Seq[IrodsData]] =
		parseCollContents(coll, IrodsData(_, coll))

	private def parseCollContents[T](coll: IrodsColl, parser: String => T): Future[Seq[T]] =
		default.list(coll).map: paths =>
			paths.map: path =>
				val suffix = path.split("/").last
				parser(suffix)

	// Assuming we want to move files from ../to_merge/both_places/name/ to ../name/
	def mergeMoveFromTempFolder(name: String): Future[Done] =
		val toMerge = IrodsColl("to_merge")
		val bothPlaces = IrodsColl("both_places", Some(toMerge))
		val from = IrodsColl(name, Some(bothPlaces))
		val to = IrodsColl(name)
		println(s"Merge-moving ${from.path} --> ${to.path}")
		mergeMove(from, to)//.take(3)
			.wireTap(printMoveAction)
			.mapAsyncUnordered(5)(act => doMoveAction(act).map(_ => act))
			.runWith(Sink.ignore)
	end mergeMoveFromTempFolder

	def mergeMultiFolders(): Future[Done] =
		val names: Seq[String] = Seq("asciiEtcRawTimeSer", "asciiEtcHalfHourlyProductTimeSer", "asciiAtcTimeSer", "asciiAtcProductTimeSer")
		names.foldLeft(done)((soFar, name) => soFar.flatMap(_ => mergeMoveFromTempFolder(name)))

	private def doMoveAction(action: MoveAction): Future[Done] =
		val (coll, requests) = action
		default.create(coll, false).flatMap: _ =>
			Source(requests)
				.mapAsyncUnordered(5): req =>
					default.moveObject(req.from, req.to)
				.runWith(Sink.ignore)

	private def printMoveAction(action: MoveAction): Unit =
		val (coll, requests) = action
		println(s"Creating folder ${coll.path}")
		requests.foreach:
			case MoveRequest(from, to) =>
				println(s"Move from ${from.path} to ${to.path}")

//	val sinkFut: Future[Sink[Int, String]] = Future.failed(new Exception("kaboom"))
//
//	val asyncSink = Sink.lazyInitAsync(() => sinkFut).mapMaterializedValue(_
//			.map{
//				case None => throw new Exception("No data came through")
//				case Some(inner) => inner
//			}
//			.recover{
//				case err => err.getMessage
//			}
//		)
//
//	def testAsyncSink = {
//		val sumSink = Sink.fold[Int, Int](0)(_ + _)
//		Source.fromIterator(() => Iterator.fill(42)(42)).wireTapMat(asyncSink)(Keep.right).toMat(sumSink)(Keep.both).run()
//	}
end B2Playground
