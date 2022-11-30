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

	describe("Netcdf reader"){
		val cm = new ColumnsMeta(Seq(PlainColumn(FloatValue, "value_std_dev", false)))
		
		def countRows(path: String) =
			val file = Path.of(path)
			val ncFile = NetcdfDatasets.openFile(path, null)
			val converter = ObspackNcToBinTable(file, cm)

			converter match {
				case Success(c) => 
					val rows = c.readRows()

					println("Size: " + rows.size)

				case Failure(e) => throw e
			}

		it("Counts the rows in the files"){
			val path1 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl.nc"
			val path2 = "/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc"

			countRows(path1)
			countRows(path2)
		}
	}
}

