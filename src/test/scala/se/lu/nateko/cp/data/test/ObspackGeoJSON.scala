package se.lu.nateko.cp.data.test

import se.lu.nateko.cp.meta.core.data.FeatureCollection
import se.lu.nateko.cp.meta.core.data.GeoJson
import se.lu.nateko.cp.meta.core.data.Position
import ucar.nc2.dataset.NetcdfDatasets

import java.io.File
import scala.collection.JavaConverters._
import scala.util.Using

object ObspackGeoJSONWorkbench:

	val baseDir = "/home/klara/Downloads/"
	val ncDir1 = "obspack_ch4_466_GLOBALVIEWplus_v8.0_2023-03-08/obspack_ch4_466_GLOBALVIEWplus_v8.0_2022-03-08/nc"
	val ncDir2 = "obspack_co2_466_GLOBALVIEWplus_v8.0_2023-03-08/obspack_co2_466_GLOBALVIEWplus_v8.0_2022-03-08/nc"

	//to be run from a REPL
	def printGeoJson: Unit =
		println(getSiteLocations(ncDir1))
		println("-----------------------------------------------------------------")
		println(getSiteLocations(ncDir2))

	def getSiteLocations(dir: String) =
		val stationFiles = File(baseDir + dir).listFiles().distinctBy(_.getName.split("_")(1)).toIndexedSeq

		val positions = stationFiles.flatMap{f =>
			Using(NetcdfDatasets.openDataset(f.toString)){ncfile =>
				val lat = ncfile.findGlobalAttribute("site_latitude").getNumericValue()
				val lon = ncfile.findGlobalAttribute("site_longitude").getNumericValue()
				val alt = ncfile.findGlobalAttribute("site_elevation").getNumericValue()
				//val siteCountry = ncfile.findGlobalAttribute("site_country").getStringValue()
				val siteCode = ncfile.findGlobalAttribute("site_code").getStringValue()
				val siteName = ncfile.findGlobalAttribute("site_name").getStringValue()

				Position(lat.doubleValue, lon.doubleValue, Some(alt.floatValue), Some(s"$siteCode ($siteName)"))
			}.toOption
		}

		val coll = FeatureCollection(positions, None)

		GeoJson.fromFeature(coll)
