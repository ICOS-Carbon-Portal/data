package se.lu.nateko.cp.data.test.formats.bintable

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite

import akka.actor.ActorSystem
import akka.stream.Materializer
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable.*
import se.lu.nateko.cp.data.test.TestUtils.*

class BinTableSourceTests extends AnyFunSuite with BeforeAndAfterAll{

	private implicit val system: ActorSystem = ActorSystem("binTableSinkTests")

	override def afterAll(): Unit = {
		system.terminate()
	}

	test("Reading columns from BinTable sequentially as ByteString streams"){

		val file = getFileInTarget("intFloatDouble344.cpb")

		val n = 344
		val schema = new Schema(Array(DataType.INT, DataType.FLOAT, DataType.DOUBLE), n.toLong)

		val source = BinTableSource(file, schema, Seq(0, 1, 2))

		val bytes = Await.result(source.runFold(ByteString.empty)(_ ++ _), 1.second)

		val firstCol = bytes.take(n * 4).asByteBuffer.asIntBuffer
		assert(firstCol.get(0) === 6466)
		assert(firstCol.get(n - 1) === 6809)

		val secondCol = bytes.drop(n * 4).take(n * 4).asByteBuffer.asFloatBuffer
		assert(secondCol.get(0) === 0.1646847f)
		assert(secondCol.get(n - 1) === 0.1612696f)

		val thirdCol = bytes.drop(n * 8).asByteBuffer.asDoubleBuffer
		assert(thirdCol.get(0) === 419.2594)
		assert(thirdCol.get(n - 1) === 202.5468)
	}

	test("Empty file gives BinTableSource that cancels downstream immediately"){
		pending
	}
}
