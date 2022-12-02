package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.ValueFormat.{FloatValue, Iso8601DateTime}
import se.lu.nateko.cp.data.formats.PlainColumn
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.time.Calendar
import se.lu.nateko.cp.data.formats.bintable.FileExtension
import se.lu.nateko.cp.data.utils.io.withSuffix

import java.nio.file.Path
import scala.util.Failure
import scala.util.Success
import scala.util.Using
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import scala.concurrent.ExecutionContext
import java.nio.file.Files
import akka.actor.ActorSystem
import scala.concurrent.ExecutionContextExecutor
import se.lu.nateko.cp.data.formats.bintable.BinTableRowReader
import akka.NotUsed
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter
import scala.collection.JavaConverters._
import java.io.File
import akka.dispatch.Futures
import scala.concurrent.Future
import akka.stream.IOResult
import akka.util.ByteString
import akka.stream.scaladsl.FileIO
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

class ObspackNcToBinTableTest extends AnyFunSpec {

	private given system: ActorSystem = ActorSystem("ObspackNcToBinTableTest")
	given dispatcher: ExecutionContextExecutor = system.dispatcher

	val path1 = "/home/klara/netcdf/co2_con_aircraft-insitu_42_allvalid.nc"
	// val path1 = "/home/oleg/Documents/CP/netcdfNOAA/co2_con_aircraft-insitu_42_allvalid.nc"
	val path2 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"
	// val path2 = "/home/oleg/Documents/CP/netcdfAlex/nc/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"

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

		ignore("Reading date variable test"){
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

		// val file = new File(origFile.getAbsolutePath + bintable.FileExtension)

		it("Parses nc file as csv"){
			import ObspackNcToBinTable.TypedVar

			val file = Path.of(path1).withSuffix(FileExtension)
			val tmpFile = file.withSuffix(".working")
			val parser = getParserForFile(path1)


			val nRows = parser.schema.size.toInt
			val actualColumns = Some(Seq("time", "value"))

			val readSchema = TimeSeriesToBinTableConverter.getReadingSchema(None, None, nRows, cm)

			val flTest: AnyVal = 3.75e-4f
			println("test float serializer: " + readSchema.serializers(1)(flTest).toString)

			println("read schema indices: " + readSchema.fetchIndices.mkString(", "))
			/*
			var resFut = Source(parser.readRows()).runWith(BinTableSink(tmpFile.toFile, true))
				.flatMap{nRowsWritten =>
					println(s"Written $nRowsWritten")

					val rowsSrc = new BinTableRowReader(tmpFile.toFile, readSchema.binSchema)
						.rows(readSchema.fetchIndices, 0L, 100)
						.map{row =>
							row.indices.map{i =>
								row(i).toString//readSchema.serializers(i)(row(i))
							}.mkString("", ",", "\n")
						}
						.mapMaterializedValue(_ => NotUsed)
					val header = Source.single(readSchema.fetchedColumns.mkString("", ",", "\n"))
					val csvFile = Path.of("/home/klara/netcdf/co2_con_aircraft-insitu_42_allvalid.csv")
					header.concat(rowsSrc).map(t => ByteString(t)).runWith(FileIO.toPath(csvFile))

					// val result: Future[IOResult] = Source(csvSource).map(t => ByteString(t)).runWith(FileIO.toPath(Path.of("/home/klara/netcdf/co2_con_aircraft-insitu_42_allvalid.csv")))

					
					//Files.deleteIfExists(tmpFile)
					// Files.deleteIfExists(csvFile)
				}
				.andThen{
					case _ => parser.close()
				}
			println(Await.result(resFut, 200.seconds))*/
		}
	}

	private class StopWatch:
		private val start = System.currentTimeMillis()
		def elapsedMs: Long = System.currentTimeMillis() - start

}
