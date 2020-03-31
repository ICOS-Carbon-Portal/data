package se.lu.nateko.cp.data.test.streams

import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.streams.StatefulInitSink
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import org.scalatest.BeforeAndAfterAll
import akka.actor.ActorSystem
import akka.stream.Materializer
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class StatefulInitSinkTests extends AnyFunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("StatefulInitSinkTests")

	override def afterAll(): Unit = {
		system.terminate()
	}

	test("reinitializes properly at each use, as expected"){
		val sink = StatefulInitSink(() => {
			var x = 0
			Sink.fold[Int, Int](x)((_, next) => {x += next; x})
		})

		val sum1 = Await.result(Source.apply(List(1, 2, 3)).runWith(sink).flatten, 1.second)
		val sum2 = Await.result(Source.apply(List(3, 4, 5)).runWith(sink).flatten, 1.second)

		assert(sum1 == 6)
		assert(sum2 == 12)
	}
}
