package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import akka.actor.ActorSystem
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import org.scalatest.funspec.AsyncFunSpec
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.PlainColumn
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter
import se.lu.nateko.cp.data.formats.ValueFormat.FloatValue
import se.lu.nateko.cp.data.formats.ValueFormat.Iso8601DateTime
import se.lu.nateko.cp.data.formats.bintable.BinTableRowReader
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import se.lu.nateko.cp.data.formats.bintable.FileExtension
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import se.lu.nateko.cp.data.utils.io.withSuffix

import java.nio.file.Path
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future

class ObspackNcToBinTableTest extends AsyncFunSpec {

	private given system: ActorSystem = ActorSystem("ObspackNcToBinTableTest")
	given dispatcher: ExecutionContextExecutor = system.dispatcher

	def readNCFile(path: Path, columnsMeta: ColumnsMeta, debug: String): Future[IndexedSeq[IndexedSeq[String]]] =
		import ObspackNcToBinTable.TypedVar

		val parser = ObspackNcToBinTable(path, columnsMeta).get
		val tmpFile = path.withSuffix(FileExtension).withSuffix(".working")
		val nRows = parser.schema.size.toInt
		val readSchema = TimeSeriesToBinTableConverter.getReadingSchema(None, None, nRows, columnsMeta)

		var resFut = Source(parser.readRows()).runWith(BinTableSink(tmpFile.toFile, true))
			.flatMap{nRowsWritten =>
				println(s"Written $nRowsWritten")

				val rowsSrc = new BinTableRowReader(tmpFile.toFile, readSchema.binSchema)
					.rows(readSchema.fetchIndices, 0L, 350)
					.map{row =>
						row.indices.map{i =>
							readSchema.serializers(i)(row(i))
						}
					}
				
				rowsSrc.runWith(Sink.collection[IndexedSeq[String], IndexedSeq[IndexedSeq[String]]])
			}.andThen{
				case _ => parser.close()
			}

		resFut

	type Columns = IndexedSeq[IndexedSeq[String]]

	def test(description: String, data: Future[Columns], getActualVal: Columns => String | Double, expectedVal: String | Double) =
		it(description) {
			data map { columns => assert(getActualVal(columns) == expectedVal) }
		}

	val valueIndex = 0
	val timestampIndex = 1
	val latIndex = 2
	val lonIndex = 3

	describe("Read values from first file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false),
			PlainColumn(FloatValue, "latitude", false),
			PlainColumn(FloatValue, "longitude", false)
		))

		val path = Path.of(getClass.getResource("/co2_con_aircraft-insitu_42_allvalid_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")

		test("First value", data, columns => columns(0)(valueIndex).toDouble, "0.00038232992".toDouble)
		test("Last value", data, columns => columns(317)(valueIndex).toDouble, "0.00038731386".toDouble)

		test("First timestamp", data, columns => columns(0)(timestampIndex), "2005-11-05T02:23:04Z")
		test("Last timestamp", data, columns => columns(317)(timestampIndex), "2005-11-05T21:07:34Z")

		test("First latitude", data, columns => columns(0)(latIndex), "35.925")
		test("Last latitude", data, columns => columns(317)(latIndex), "35.618")

		test("First longitude", data, columns => columns(0)(lonIndex), "140.3")
		test("Last longitude", data, columns => columns(317)(lonIndex), "140.47")

	}

	describe("Read values from second file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false)
		))

		val path = Path.of(getClass.getResource("/co2_ssl_tower-insitu_23_allvalid-12magl_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")

		test("First value", data, columns => columns(0)(valueIndex).toDouble, "0.000384392".toDouble)
		test("Last value", data, columns => columns(93)(valueIndex).toDouble, "0.00038229".toDouble)

		test("First timestamp", data, columns => columns(0)(timestampIndex), "2005-01-01T03:00:00Z")
		test("Last timestamp", data, columns => columns(93)(timestampIndex), "2005-01-05T00:00:00Z")

	}

}
