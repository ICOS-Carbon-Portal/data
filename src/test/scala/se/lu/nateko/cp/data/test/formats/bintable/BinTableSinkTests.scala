package se.lu.nateko.cp.data.test.formats.bintable

import org.scalatest.FunSuite
import java.io.File
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.netcdf.PlainColumn
import akka.stream.scaladsl.Source
import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import org.scalatest.BeforeAndAfterAll
import scala.concurrent.Future
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.data.formats.csv.CsvParser
import akka.stream.io.Framing
import akka.util.ByteString
import akka.stream.scaladsl.Sink

class BinTableSinkTests extends FunSuite with BeforeAndAfterAll{

	def getFileInTarget(fileName: String) = new File(getClass.getResource("/").getFile + fileName)

	private implicit val system = ActorSystem("bintabletest")
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

		val schema = new Schema(Array(DataType.INT, DataType.FLOAT), 344)

		val rowsSource = linesSource.drop(4).take(schema.size).scan(CsvParser.seed)(parser.parseLine).collect{
			case acc if !acc.cells.isEmpty =>
				new BinTableRow(
					Array(Int.box(acc.cells(1).toInt), Float.box(acc.cells(2).toFloat)),
					schema
				)
		}

		val sink = BinTableSink(file)

		val rowsWritten = Await.result(rowsSource.runWith(sink), 3 seconds)

		assert(rowsWritten == schema.size)
	}

}
