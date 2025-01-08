package se.lu.nateko.cp.data.test.api

import akka.Done
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

	def list(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)
	}

	def listRoot() =
		val items = Await.result(default.list(B2SafeItem.Root), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)


	def countItems(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)): Future[Int] =
		default.list(IrodsColl(path, parent)).map:
			//_.runFold(0)((sum, _) => sum + 1)
			_.size


	def testUpload(name: String, nMb: Long, viaSink: Boolean, parent: IrodsColl = B2SafeItem.Root) =
		val mb = ByteString(Array.ofDim[Byte](1 << 20))
		val dobj = IrodsData(name, parent)

		val src = Source.repeat(mb).take(nMb)//.delay(200.milli, OverflowStrategy.backpressure)

		if viaSink then
			src.runWith(default.objectSink(dobj))
		else
			default.uploadObject(dobj, src)

	def uploadFile(filePath: String, parent: IrodsColl = B2SafeItem.Root): Future[Seq[(Long, Int)]] =
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

	def deleteFile(name: String, parent: IrodsColl = B2SafeItem.Root): Unit =
		awaitAndReport(default.delete(IrodsData(name, parent))): (done, ms) =>
			println(s"File deleted in $ms ms")

	def parWriteShutdown(handle: String): Future[Done] =
		default.parWriteShutdown(IRODSClient.ParWriteHandle(handle))

	def downloadFile(targetPath: String, name: String, parent: IrodsColl = B2SafeItem.Root): Unit =
		val doneFut = default.downloadObject(IrodsData(name, parent)).flatMap: src =>
			src.runWith(FileIO.toPath(Paths.get(targetPath)))
		awaitAndReport(doneFut): (res, ms) =>
			println(s"$res , done in $ms ms")

	def getHashsum(name: String, parent: IrodsColl = B2SafeItem.Root): Unit =
		awaitAndReport(default.getHashsum(IrodsData(name, parent))): (hash, ms) =>
			println(s"Hash $hash, elapsed $ms ms")

	def testDownload(name: String, parent: IrodsColl = B2SafeItem.Root): Unit =
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
