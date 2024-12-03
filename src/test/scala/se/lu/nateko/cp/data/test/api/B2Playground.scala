package se.lu.nateko.cp.data.test.api

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.ConfigReader
import se.lu.nateko.cp.data.api.*

import scala.concurrent.Await
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

object B2Playground:

	private given system: ActorSystem = ActorSystem("B2StageClient")
	system.log
	given ExecutionContextExecutor = system.dispatcher
	private val http = akka.http.scaladsl.Http()

	def stop() = system.terminate()

	val uplConfig = ConfigReader.getDefault.upload
	//val b2config = uplConfig.b2safe.copy(dryRun = false)
	val irodsConfig = uplConfig.irods.copy(dryRun = false)
	val default = new IRODSClient(irodsConfig, http)//new B2SafeClient(b2config, http)

	def list(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)) = {
		val items = Await.result(default.list(IrodsColl(path, parent)), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)
	}

	def listRoot() = {
		val items = Await.result(default.list(B2SafeItem.Root), 5.seconds)
		//items.runForeach(println)
		items.foreach(println)
	}

	def countItems(path: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)): Future[Int] = {
		default.list(IrodsColl(path, parent)).map{
			//_.runFold(0)((sum, _) => sum + 1)
			_.size
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
end B2Playground
