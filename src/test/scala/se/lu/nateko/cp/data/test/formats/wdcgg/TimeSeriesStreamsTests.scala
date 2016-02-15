package se.lu.nateko.cp.data.test.formats.wdcgg

import org.scalatest.FunSuite
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesStreams._
import akka.stream.scaladsl.Sink
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import org.scalatest.BeforeAndAfterAll
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class TimeSeriesStreamsTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("bintabletest")
	private implicit val materializer = ActorMaterializer()
	import system.dispatcher

	override def afterAll() {
		system.shutdown()
	}

	def wdcggStream = getClass.getResourceAsStream("/ams137s00.lsce.as.cn.co2.nl.mo.dat")

	test("Parsing of an example WDCGG time series dataset"){

		val rowsFut = StreamConverters
			.fromInputStream(() => wdcggStream)
			.via(linesFromBinary)
			.via(wdcggParser)
			.runWith(Sink.seq)

		val rows = Await.result(rowsFut, 3 seconds)
		assert(rows.size === 361)
	}
}