package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.FloatValue
import se.lu.nateko.cp.data.formats.PlainColumn
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import ucar.nc2.dataset.NetcdfDatasets

import java.nio.file.Path
import scala.util.Failure
import scala.util.Success

class ObspackNcToBinTableTest extends AnyFunSpec {

	describe("Netcdf reading workbench"){
		val cm = new ColumnsMeta(Seq(PlainColumn(FloatValue, "value", false)))
		
		def countRows(path: String): Unit =
			val watch = new StopWatch
			val file = Path.of(path)
			val ncFile = NetcdfDatasets.openFile(path, null)
			val converter = ObspackNcToBinTable(file, cm).get
			println(s"In ${watch.elapsedMs} ms, prepared ObspackNcToBinTable for $path")
			val rows = converter.readRows()
			var size: Int = 0
			rows.foreach{_ => size += 1}
			println(s"In ${watch.elapsedMs} ms, got number of rows: $size")


		ignore("Counts the rows in the files"){
			//val path1 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl.nc"
			val path1 = "/home/oleg/Documents/CP/netcdfNOAA/co2_con_aircraft-insitu_42_allvalid.nc"
			//val path2 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"
			val path2 = "/home/oleg/Documents/CP/netcdfAlex/nc/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"

			countRows(path1)
			countRows(path2)
		}
	}

	private class StopWatch:
		private val start = System.currentTimeMillis()
		def elapsedMs: Long = System.currentTimeMillis() - start
}

