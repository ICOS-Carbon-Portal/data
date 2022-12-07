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
					.rows(readSchema.fetchIndices, 0L, nRowsWritten.toInt)
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

	type Rows = IndexedSeq[IndexedSeq[String]]

	def test(description: String, data: Future[Rows], getActualVal: Rows => String | Double, expectedVal: String | Double) =
		it(description) {
			data map { rows => assert(getActualVal(rows) == expectedVal) }
		}

	val ValueIndex = 0
	val TimestampIndex = 1
	val LatIndex = 2
	val LonIndex = 3

	describe("Read values from first file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false),
			PlainColumn(FloatValue, "latitude", false),
			PlainColumn(FloatValue, "longitude", false)
		))

		val path = Path.of(getClass.getResource("/co2_con_aircraft-insitu_42_allvalid_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")

		it("Reads correct number of rows") {
			data map { rows => assert(rows.length == 318) }
		}

		test("First value", data, _(0)(ValueIndex).toDouble, "0.00038232992".toDouble)
		test("Last value", data, _(317)(ValueIndex).toDouble, "0.00038731386".toDouble)

		test("First timestamp", data, _(0)(TimestampIndex), "2005-11-05T02:23:04Z")
		test("Last timestamp", data, _(317)(TimestampIndex), "2005-11-05T21:07:34Z")

		test("First latitude", data, _(0)(LatIndex), "35.925")
		test("Last latitude", data, _(317)(LatIndex), "35.618")

		test("First longitude", data, _(0)(LonIndex), "140.3")
		test("Last longitude", data, _(317)(LonIndex), "140.47")

	}

	describe("Read values from second file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false)
		))

		val path = Path.of(getClass.getResource("/co2_ssl_tower-insitu_23_allvalid-12magl_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")


		it("Reads correct number of rows") {
			data map { rows => assert(rows.length == 94) }
		}

		test("First value", data, _(0)(ValueIndex).toDouble, "0.000384392".toDouble)
		test("Last value", data, _(93)(ValueIndex).toDouble, "0.00038229".toDouble)

		test("First timestamp", data, _(0)(TimestampIndex), "2005-01-01T03:00:00Z")
		test("Last timestamp", data, _(93)(TimestampIndex), "2005-01-05T00:00:00Z")

	}

}
