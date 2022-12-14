package se.lu.nateko.cp.data.test.api

import se.lu.nateko.cp.data.api.*
import akka.util.ByteString
import akka.stream.scaladsl.Source
import scala.concurrent.Future
import scala.concurrent.ExecutionContextExecutor

object B2Playground{
	import akka.actor.ActorSystem
	import akka.stream.Materializer
	import scala.concurrent.Await
	import scala.concurrent.duration.DurationInt
	import se.lu.nateko.cp.data.ConfigReader

	implicit private val system: ActorSystem = ActorSystem("B2StageClient")
	system.log
	implicit val dispatcher: ExecutionContextExecutor = system.dispatcher
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()

	val b2config = ConfigReader.getDefault.upload.b2safe.copy(dryRun = false)
	val default = new B2SafeClient(b2config, http)

	def list(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		items.runForeach(println)
	}

	def listRoot() = {
		val items = Await.result(default.list(B2SafeItem.Root), 5.seconds)
		items.runForeach(println)
	}

	def countItems(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)): Future[Int] = {
		default.list(IrodsColl(path, parent)).flatMap{
			_.runFold(0)((sum, _) => sum + 1)
		}
	}

	def testUpload(name: String, nMb: Long, viaSink: Boolean, parent: IrodsColl = B2SafeItem.Root) = {
		val mb = ByteString(Array.ofDim[Byte](1 << 20))
		val dobj = IrodsData(name, parent)

		val src = Source.repeat(mb).take(nMb)//.delay(200.milli, OverflowStrategy.backpressure)

		val start = System.currentTimeMillis

		val hash = if(viaSink)
			Await.result(src.runWith(default.objectSink(dobj)), 3.minute)
		else
			Await.result(default.uploadObject(dobj, src), 3.minute)

		val elapsed = System.currentTimeMillis - start
		println(s"SHA256 = $hash, elapsed $elapsed ms")
	}

	def testDownload(name: String, parent: IrodsColl = B2SafeItem.Root): Unit = {
		val lfut = default.downloadObjectOnce(IrodsData(name, parent)).flatMap(
			_.runFold(0L)((sum, bs) => {println(sum); sum + bs.length})
		)
		val start = System.currentTimeMillis
		val size = Await.result(lfut, 3.minute)
		val elapsed = System.currentTimeMillis - start
		println(s"Size $size, elapsed $elapsed ms")
	}

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
}
