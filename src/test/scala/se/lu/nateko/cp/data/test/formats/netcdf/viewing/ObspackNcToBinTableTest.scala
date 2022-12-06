package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import akka.NotUsed
import akka.actor.ActorSystem
import akka.stream.IOResult
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import akka.util.ByteString
import org.scalatest.funspec.AnyFunSpec
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
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.time.Calendar

import java.nio.file.Path
import scala.concurrent.Await
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.duration.DurationInt
import scala.util.Using
import java.time.Instant
import org.scalatest.BeforeAndAfterAll

class ObspackNcToBinTableTest extends AnyFunSpec with  BeforeAndAfterAll{

	private given system: ActorSystem = ActorSystem("ObspackNcToBinTableTest")
	given dispatcher: ExecutionContextExecutor = system.dispatcher

	val path1 = getClass.getResource("/co2_con_aircraft-insitu_42_allvalid_small.nc").getPath
	val path2 = getClass.getResource("/co2_ssl_tower-insitu_23_allvalid-12magl_small.nc").getPath

	val csvPath = Path.of("src/test/resources/co2_con_aircraft-insitu_42_allvalid_small.csv")
	val tmpFile = Path.of(path1).withSuffix(FileExtension).withSuffix(".working")

	describe("Netcdf reading workbench"){
		val cm = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false)
		))

		def getParserForFile(path: String) =
			val file = Path.of(path)
			ObspackNcToBinTable(file, cm).get

		def countRows(path: String): Int =
			val watch = new StopWatch
			import watch.elapsedMs

			println(s"At time $elapsedMs ms, prepared ObspackNcToBinTable for $path")

			val rows = getParserForFile(path).readRows()
			println(s"At time $elapsedMs ms, prepared rows Iterable for $path")

			var size: Int = 0
			rows.foreach{_ => size += 1}
			println(s"At time $elapsedMs ms, iterated through $size rows")
			size


		ignore("Counts the rows in the files"){
			countRows(path1)
			countRows(path2)
		}

		ignore("Reading date variable"){
			Using(NetcdfDatasets.openDataset(path1)){ncfile =>
				val timeVar = ncfile.findVariable("time")
				val unit = timeVar.attributes().findAttribute("units").getStringValue
				val timeHelper = new CoordinateAxisTimeHelper(Calendar.gregorian, unit)
				val ncArr = timeVar.read()
				val firstDate = timeHelper.makeCalendarDateFromOffset(ncArr.getDouble(0))
				val lastDate = timeHelper.makeCalendarDateFromOffset(ncArr.getDouble(ncArr.getSize.toInt - 1))
				println(firstDate)
				println(lastDate)

				// val sb = new java.lang.StringBuilder();
				// val formatter = new Formatter(sb, Locale.ENGLISH);
				// //val group = new Group(ncfile, null, "x07")
				// val sliceAxis = CoordinateAxis1DTime.factory(ncfile, VariableDS.builder().copyFrom(timeVar).build(null), formatter);
				// val dList = sliceAxis.getCalendarDates()
				// println(s"got number of dates: ${dList.size()}")
				// println(dList.get(0))
				// println(dList.get(dList.size - 1))
			}.get
		}

		it("Parses nc file as CSV"){
			import ObspackNcToBinTable.TypedVar

			val parser = getParserForFile(path1)
			val nRows = parser.schema.size.toInt
			val readSchema = TimeSeriesToBinTableConverter.getReadingSchema(None, None, nRows, cm)

			var resFut = Source(parser.readRows()).runWith(BinTableSink(tmpFile.toFile, true))
				.flatMap{nRowsWritten =>
					println(s"Written $nRowsWritten")

					val rowsSrc = new BinTableRowReader(tmpFile.toFile, readSchema.binSchema)
						.rows(readSchema.fetchIndices, 0L, 100)
						.map{row =>
							row.indices.map{i =>
								readSchema.serializers(i)(row(i))
							}.mkString("", ",", "\n")
						}
						.mapMaterializedValue(_ => NotUsed)
					val header = Source.single(readSchema.fetchedColumns.mkString("", ",", "\n"))
					header.concat(rowsSrc).map(t => ByteString(t)).runWith(FileIO.toPath(csvPath))
				}
				.andThen{
					case _ => parser.close()
				}

			val res = Await.result(resFut, 200.seconds)
		}

		it("Reads samples from CSV"){
			val bufferedSource = io.Source.fromFile(csvPath.toFile)
			val lines = bufferedSource.getLines()

			lines.next() // skip csv header

			val first = lines.next().split(",")
			val second = lines.next().split(",")

			assert(first(0).toDouble == "0.00038232992".toDouble)
			assert(second(0).toDouble == "0.00038208973".toDouble)

			assert(first(1).toString == Instant.ofEpochSecond(1131157384).toString)
			assert(second(1).toString == Instant.ofEpochSecond(1131157394).toString)
		}
	}

	override protected def afterAll(): Unit =
		csvPath.toFile().delete()
		tmpFile.toFile().delete()

	private class StopWatch:
		private val start = System.currentTimeMillis()
		def elapsedMs: Long = System.currentTimeMillis() - start

}
