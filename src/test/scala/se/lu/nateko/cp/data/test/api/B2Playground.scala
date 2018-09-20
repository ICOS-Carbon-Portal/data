package se.lu.nateko.cp.data.test.api

import se.lu.nateko.cp.data.api._
import akka.util.ByteString
import se.lu.nateko.cp.data.ConfigReader
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.Sink
import scala.concurrent.Future

object B2Playground{
	import akka.actor.ActorSystem
	import akka.stream.ActorMaterializer
	import scala.concurrent.Await
	import scala.concurrent.duration.DurationInt
	import se.lu.nateko.cp.data.ConfigReader

	implicit private val system = ActorSystem("B2StageClient")
	system.log
	implicit private val materializer = ActorMaterializer(namePrefix = Some("B2StageClient_mat"))
	implicit val dispatcher = system.dispatcher
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()

	val default = new B2StageClient(ConfigReader.getDefault.upload.b2stage, http)

	def list(path: String, parent: Option[IrodsColl] = Some(B2StageItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		items.foreach(println)
		items
	}

	def testUpload(name: String, nMb: Long, viaSink: Boolean, parent: IrodsColl = B2StageItem.Root) = {
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

	def testDownload(name: String, parent: IrodsColl = B2StageItem.Root): Unit = {
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
