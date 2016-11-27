package se.lu.nateko.cp.data.services.fetch

import se.lu.nateko.cp.data.StiltConfig
import java.nio.file.Paths
import java.io.File
import java.nio.file.Files
import scala.collection.JavaConversions._
import java.nio.file.Path
import akka.stream.scaladsl.Source
import scala.io.{Source => IoSource}
import akka.util.ByteString
import akka.NotUsed
import se.lu.nateko.cp.data.formats.csv.NumericScv
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.formats.netcdf.viewing.Raster


class StiltResultsFetcher(config: StiltConfig, netcdf: NetCdfConfig) {
	import StiltResultFetcher._

	private[this] val resFileGlob = "stiltresults????.csv"
	private[this] val resFilePattern = resFileGlob.replace("????", "(\\d{4})").r
	private[this] val resFolder = "Results"
	private[this] val footPrintsFolder = "Footprints"

	def resFileName(year: Int): String = resFileGlob.replace("????", year.toString)

	def getStationsAndYears: Map[String, Seq[Int]] = {

		def stationYears(dir: File): Seq[Int] = listFileNames(dir.toPath, resFileGlob).collect{
			case resFilePattern(dddd) => dddd.toInt
		}

		val stationFolders = new File(config.mainFolder, resFolder).listFiles().filter(_.isDirectory)
		stationFolders.map(stFold => (stFold.getName, stationYears(stFold))).toMap
	}

	def getFootprintFiles(stationId: String, year: Int): Seq[String] = {
		val stationPath = Paths.get(config.mainFolder, footPrintsFolder, stationId)
		listFileNames(stationPath, "foot" + year + "*.nc")
	}

	def getStiltResultJson(stationId: String, year: Int, columns: Seq[String]): Source[ByteString, NotUsed] = {
		val resultsPath = Paths.get(config.mainFolder, resFolder, stationId, resFileName(year))
		val src = IoSource.fromFile(resultsPath.toFile)
		NumericScv.getJsonSource(src, columns)
	}

	def getFootprintRaster(stationId: String, filename: String): Raster = {
		val factory = {
			import netcdf._
			import scala.collection.JavaConversions._
			val footprintsFolder = Paths.get(config.mainFolder, footPrintsFolder, stationId).toString + File.separator
			new ViewServiceFactoryImpl(footprintsFolder, dateVars, latitudeVars, longitudeVars, elevationVars)
		}
		val service = factory.getNetCdfViewService(filename)
		val date = service.getAvailableDates()(0)
		service.getRaster(date, "foot", null)
	}
}

object StiltResultFetcher{

	def listFileNames(dir: Path, fileGlob: String): Seq[String] = {
		val dirStream = Files.newDirectoryStream(dir, fileGlob)
		try{
			dirStream
				.iterator()
				.map(_.getFileName.toString)
				.toIndexedSeq
		} finally {
			dirStream.close()
		}
	}
}
