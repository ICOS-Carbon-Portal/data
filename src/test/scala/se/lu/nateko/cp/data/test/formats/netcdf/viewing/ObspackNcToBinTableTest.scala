package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.FloatValue
import se.lu.nateko.cp.data.formats.Iso8601DateTime
import se.lu.nateko.cp.data.formats.PlainColumn
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.time.Calendar

import java.nio.file.Path
import scala.util.Failure
import scala.util.Success
import scala.util.Using

class ObspackNcToBinTableTest extends AnyFunSpec {

	//val path1 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl.nc"
	val path1 = "/home/oleg/Documents/CP/netcdfNOAA/co2_con_aircraft-insitu_42_allvalid.nc"
	//val path2 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"
	val path2 = "/home/oleg/Documents/CP/netcdfAlex/nc/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"

	describe("Netcdf reading workbench"){
		val cm = new ColumnsMeta(Seq(
			PlainColumn(FloatValue, "value", false),
			PlainColumn(Iso8601DateTime, "time", false)
		))
		
		def countRows(path: String): Unit =
			val watch = new StopWatch
			import watch.elapsedMs

			val file = Path.of(path)
			val converter = ObspackNcToBinTable(file, cm).get
			println(s"At time $elapsedMs ms, prepared ObspackNcToBinTable for $path")

			val rows = converter.readRows()
			println(s"At time $elapsedMs ms, prepared rows Iterable for $path")

			var size: Int = 0
			rows.foreach{_ => size += 1}
			println(s"At time $elapsedMs ms, iterated through $size rows")


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
	}

	private class StopWatch:
		private val start = System.currentTimeMillis()
		def elapsedMs: Long = System.currentTimeMillis() - start
}

