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
					.rows(readSchema.fetchIndices, 0L, 100)
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

	def testDouble(description: String, data: Future[IndexedSeq[IndexedSeq[String]]], i: Int, j: Int, expectedVal: String) =
		it(description) {
			data map { columns => assert(columns(i)(j).toDouble == expectedVal.toDouble) }
		}

	def testString(description: String, data: Future[IndexedSeq[IndexedSeq[String]]], i: Int, j: Int, expectedVal: String) = 
		it(description) {
			data map { columns => assert(columns(i)(j) == expectedVal) }
		}

	val valueVarIndex = 0
	val timestampVarIndex = 1
	val latVarIndex = 2
	val lonVarIndex = 3

	describe("Read values from first file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false),
			PlainColumn(FloatValue, "latitude", false),
			PlainColumn(FloatValue, "longitude", false)
		))

		val path = Path.of(getClass.getResource("/co2_con_aircraft-insitu_42_allvalid_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")

		testDouble("First value", data, 0, valueVarIndex, "0.00038232992")
		testDouble("Second value", data, 1, valueVarIndex, "0.00038208973")

		testString("First timestamp", data, 0, timestampVarIndex, "2005-11-05T02:23:04Z")
		testString("Second timestamp", data, 1, timestampVarIndex, "2005-11-05T02:23:14Z")

		testString("First latitude value", data, 0, latVarIndex, "35.925")
		testString("Second latitude value", data, 1, latVarIndex, "35.936")

		testString("First longitude value", data, 0, lonVarIndex, "140.3")
		testString("Second longitude value", data, 1, lonVarIndex, "140.31")

	}

	describe("Read values from second file") {

		val columnsMeta = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false)
		))

		val path = Path.of(getClass.getResource("/co2_ssl_tower-insitu_23_allvalid-12magl_small.nc").getPath)
		val data = readNCFile(path, columnsMeta, s" path: $path")

		testDouble("First value", data, 0, valueVarIndex, "0.000384392")
		testDouble("Second value", data, 1, valueVarIndex, "0.000384236")

		testString("First timestamp", data, 0, timestampVarIndex, "2005-01-01T03:00:00Z")
		testString("Second timestamp", data, 1, timestampVarIndex, "2005-01-01T04:00:00Z")

	}

}
