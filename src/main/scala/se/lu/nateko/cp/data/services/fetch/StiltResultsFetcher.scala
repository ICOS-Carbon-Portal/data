package se.lu.nateko.cp.data.services.fetch

import se.lu.nateko.cp.data.StiltConfig
import java.nio.file.Paths
import java.io.File
import java.nio.file.Files
import scala.collection.JavaConversions._
import java.nio.file.Path

class StiltResultsFetcher(config: StiltConfig) {

	private[this] val resFilePattern = "^stiltresults(\\d{4}).csv$".r
	private[this] val resFileGlob = "stiltresults????.csv"
	private[this] val resFolder = "Results"
	private[this] val footPrintsFolder = "Footprints"

	def getStationsAndYears: Map[String, Seq[Int]] = {

		def stationYears(dir: File): Seq[Int] = {
			val pathIter: Iterator[Path] = Files.newDirectoryStream(dir.toPath, resFileGlob).iterator()

			pathIter.map(p => p.getFileName.toString).collect{
				case resFilePattern(dddd) => dddd.toInt
			}.toSeq
		}

		val stationFolders = new File(config.mainFolder, resFolder).listFiles().filter(_.isDirectory)
		stationFolders.map(stFold => (stFold.getName, stationYears(stFold))).toMap
	}

	def getFootprintFiles(stationId: String, year: Int): Seq[String] = {
		val stationPath = Paths.get(config.mainFolder, footPrintsFolder, stationId)
		Files.newDirectoryStream(stationPath, "foot" + year + "*.nc")
			.iterator()
			.map(_.getFileName.toString)
			.toSeq
	}
}