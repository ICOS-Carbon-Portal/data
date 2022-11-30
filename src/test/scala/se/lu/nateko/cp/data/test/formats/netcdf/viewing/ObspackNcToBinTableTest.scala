package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import org.scalatest.funspec.AnyFunSpec
// import java.nio.File
import se.lu.nateko.cp.data.formats.netcdf.ObspackNcToBinTable
import java.nio.file.Path

class ObspackNcToBinTableTest extends AnyFunSpec {

	describe("Netcdf reader"){
		val file1 = Path.of("/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl.nc")
		val file2 = Path.of("/home/klara/netcdf/co2_ssl_tower-insitu_23_allvalid-12magl_alex.nc")

		// val converter1 = ObspackNcToBinTable(file1, null)
		// val converter2 = ObspackNcToBinTable(file2, null)

		// it("Reads two netcdf files"){
		// 	val res1 = converter1.readRows()
		// 	val res2 = converter2.readRows()

		// 	println("res 1?? " + res2)
		// 	println("res 2?? " + res2)

		// 	assert(true)
		// }
	}
}
