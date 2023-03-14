package se.lu.nateko.cp.data.test

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.meta.core.data.FeatureCollection
import se.lu.nateko.cp.meta.core.data.GeoJson
import se.lu.nateko.cp.meta.core.data.Position
import ucar.nc2.dataset.NetcdfDatasets

import java.io.File
import scala.collection.JavaConverters._
import scala.util.Failure
import scala.util.Success
import scala.util.Using

object ObspackGeoJSONWorkbench:

	def getSiteLocations(dir: String) =
		val stationFiles = File(dir).listFiles().distinctBy(_.toString.split("/").last.split("_")(1)).toIndexedSeq

		val positions = stationFiles.map{f =>
			Using(NetcdfDatasets.openDataset(f.toString)){ncfile =>
				val lat = ncfile.findGlobalAttribute("site_latitude").getNumericValue()
				val lon = ncfile.findGlobalAttribute("site_longitude").getNumericValue()
				val alt = ncfile.findGlobalAttribute("site_elevation").getNumericValue()
				val siteCountry = ncfile.findGlobalAttribute("site_country").getStringValue()
				val siteCode = ncfile.findGlobalAttribute("site_code").getStringValue()
				val siteName = ncfile.findGlobalAttribute("site_name").getStringValue()

				Position(lat.toString.toDouble, lon.toString.toDouble, Some(alt.toString.toFloat), Some(s"$siteCountry-$siteCode ($siteName)"))
			} match {
				case Success(value) => Some(value)
				case Failure(exception) => None
			}
		}.flatten

		val coll = FeatureCollection(positions, None)

		GeoJson.fromFeature(coll)

class ObspackGeoJSON extends AnyFunSpec:

	describe("geoJSON of stations"){
		val baseDir = "/home/klara/Downloads/"
		val ncDir1 = "obspack_ch4_466_GLOBALVIEWplus_v8.0_2023-03-08/obspack_ch4_466_GLOBALVIEWplus_v8.0_2022-03-08/nc"
		val ncDir2 = "obspack_co2_466_GLOBALVIEWplus_v8.0_2023-03-08/obspack_co2_466_GLOBALVIEWplus_v8.0_2022-03-08/nc"

		it("prints geoJSON of stations"){
			val siteLocations1 = ObspackGeoJSONWorkbench.getSiteLocations(baseDir + ncDir1)
			val siteLocations2 = ObspackGeoJSONWorkbench.getSiteLocations(baseDir + ncDir1)

			println(siteLocations1)
			println("-----------------------------------------------------------------")
			println(siteLocations2)

			assert(true)
		}
	}
