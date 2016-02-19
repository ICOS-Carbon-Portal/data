package se.lu.nateko.cp.data.test.formats.bintable

import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.scalatest.BeforeAndAfterAll
import org.scalatest.FunSuite

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.io.Framing
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.csv.CsvParser
import se.lu.nateko.cp.data.formats.netcdf.PlainColumn
import se.lu.nateko.cp.data.test.TestUtils._

class BinTableSinkTests extends FunSuite with BeforeAndAfterAll{

	private implicit val system = ActorSystem("binTableSinkTests")
	private implicit val materializer = ActorMaterializer()

	override def afterAll() {
		system.shutdown()
	}

	test("Write from memory, then read with BinTableReader and verify"){

		val file = getFileInTarget("binTableSinkTest.cpb")
		if(file.exists) file.delete()

		val schema = new Schema(Array(DataType.INT, DataType.LONG), 1000)

		def getRow(i: Int): Array[AnyRef] = Array(Int.box(i), Long.box(i.toLong << 16))
		def getRowIterator = Iterator.from(1).take(schema.size.toInt).map(getRow)

		val source = Source.fromIterator(() => getRowIterator)
			.map(cells => new BinTableRow(cells, schema))

		val sink = BinTableSink(file)

		val rowsWritten = Await.result(source.runWith(sink), 3 seconds)

		assert(rowsWritten == schema.size)

		val reader = new BinTableReader(file, schema)

		val firstCol = PlainColumn(reader.read(0, 0, schema.size.toInt)).flatMap(_.asInt).get.values
		val initFirstCol = getRowIterator.map(_.apply(0).asInstanceOf[Int])

		assert(firstCol.zip(initFirstCol).forall{
			case (readBack, initial) => readBack == initial
		})

		val secondCol = PlainColumn(reader.read(1, 0, schema.size.toInt)).flatMap(_.asLong).get.values
		val initSecondCol = getRowIterator.map(_.apply(1).asInstanceOf[Long])

		assert(secondCol.zip(initSecondCol).forall{
			case (readBack, initial) => readBack == initial
		})

		reader.close()

	}

	test("Read from CSV and write"){
		val csvFileSource = StreamConverters.fromInputStream(() => getClass.getResourceAsStream("/TOA5_Feud.meteo_12.dat"))

		val file = getFileInTarget("binTableSinkFromCsvTest.cpb")
		if(file.exists) file.delete()

		val linesSource: Source[String, Future[Long]] = csvFileSource.via(
				Framing.delimiter(ByteString("\n"), maximumFrameLength = 1000, allowTruncation = true)
			)
			.map(_.utf8String)

		val parser = CsvParser.default

		val schema = new Schema(Array(DataType.INT, DataType.FLOAT, DataType.DOUBLE), 344)

		def toInt(s: String): AnyRef = Int.box(s.toInt)
		def toFloat(s: String): AnyRef = Float.box(s.toFloat)
		def toDouble(s: String): AnyRef = Double.box(s.toDouble)

		val rowsSource = linesSource.drop(4).take(schema.size).scan(CsvParser.seed)(parser.parseLine).collect{
			case acc if !acc.cells.isEmpty =>
				new BinTableRow(
					Array(toInt(acc.cells(1)), toFloat(acc.cells(2)), toDouble(acc.cells(4))),
					schema
				)
		}

		val sink = BinTableSink(file)

		val rowsWritten = Await.result(rowsSource.runWith(sink), 3 seconds)

		assert(rowsWritten == schema.size)
	}

}
