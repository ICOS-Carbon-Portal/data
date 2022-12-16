package se.lu.nateko.cp.data.formats.netcdf

import ucar.ma2.ArrayFloat
import ucar.ma2.DataType
import ucar.ma2.MAMath
import ucar.ma2.Section
import ucar.nc2.Variable
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.dataset.NetcdfDataset
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.time.Calendar
import ucar.nc2.time.CalendarDate

import java.io.IOException
import java.nio.file.Path
import scala.collection.mutable.Buffer
import scala.util.Failure
import scala.util.Success
import scala.util.Try
import scala.util.Using
import scala.util.control.NoStackTrace

import collection.JavaConverters.asScalaBufferConverter

trait NetCdfViewServiceConfig:
	def dateVars: Seq[String]
	def latitudeVars: Seq[String]
	def longitudeVars: Seq[String]
	def elevationVars: Seq[String]

class ViewServiceFactory(folder: Path, config: NetCdfViewServiceConfig):
	def getNetCdfFiles(): IndexedSeq[String] =
		folder.toFile.list((_, fn) => fn.endsWith(".nc")).toIndexedSeq

	def getNetCdfViewService(fileName: String) =
		NetCdfViewService(folder.resolve(fileName), config)


object NetCdfViewService:
	def getDateParser(timeVar: Variable): Double => CalendarDate =
		val unit = timeVar.attributes().findAttribute("units").getStringValue
		val timeHelper = new CoordinateAxisTimeHelper(Calendar.gregorian, unit)
		timeHelper.makeCalendarDateFromOffset

	def readAllDates(timeVar: Variable): IndexedSeq[CalendarDate] =
		val parser = getDateParser(timeVar)
		val ncArr = timeVar.read()
		Range(0, ncArr.getSize.toInt).map{i =>
			parser(ncArr.getDouble(i))
		}
end NetCdfViewService

class VarSpec(
	val dateVar: OneDimVar, val latVar: OneDimVar,
	val lonVar: OneDimVar, val elevationVar: Option[OneDimVar]
)

case class OneDimVar(name: String, dimName: String)

class NetCdfViewService(ncFile: Path, conf: NetCdfViewServiceConfig):

	private val singleDimVarsAndDims: Map[String, OneDimVar] = withDataset{ds =>
		ds.getVariables.asScala.iterator.collect{
			case v if v.getRank == 1 => v.getShortName -> OneDimVar(v.getShortName, v.getDimension(0).getShortName)
		}.toMap
	}

	private def findOneDimVar(kind: String, options: Seq[String]): Try[OneDimVar] =
		options.flatMap(singleDimVarsAndDims.get).headOption match
			case None => Failure(
				new Exception(s"No $kind one-dimensional variable found in NetCDF. Expected one of: ${options.mkString(", ")}")
					with NoStackTrace
			)
			case Some(varNameAndDim) => Success(varNameAndDim)

	val variables = (
		for
			dateVar <- findOneDimVar("date", conf.dateVars);
			latVar <- findOneDimVar("latitude", conf.latitudeVars);
			lonVar <- findOneDimVar("longitude", conf.longitudeVars);
			elevVar = findOneDimVar("elevation", conf.elevationVars).toOption
		yield
			VarSpec(dateVar, latVar, lonVar, elevVar)
	).get

	private def withDataset[R](action: NetcdfDataset => R): R =
		val pathStr = ncFile.toAbsolutePath.toString
		Using(NetcdfDatasets.openDataset(pathStr))(action).fold({
			case exc: Throwable =>
				throw new IOException(s"Problem reading netcdf $pathStr", exc)
		}, identity)


	def getAvailableDates: IndexedSeq[CalendarDate] = withDataset{ds =>
		val timeVar = ds.findVariable(variables.dateVar.name)
		NetCdfViewService.readAllDates(timeVar)
	}

	def getAvailableElevations(varName: String): IndexedSeq[Float] =
		variables.elevationVar.fold(IndexedSeq.empty){
			elevVar => withDataset{ds =>

				// First see if this requested variable contains the elevation dimension
				val reqVar: Variable = ds.findVariable(varName)
				val dimIndex: Int = reqVar.findDimensionIndex(elevVar.dimName)

				if dimIndex > 0 then
					// It does. Continue to extract values from variable
					val ncVar = ds.findVariable(elevVar.dimName)
					val data = ncVar.read().asInstanceOf[ArrayFloat]
					data.copyTo1DJavaArray().asInstanceOf[Array[Float]].toIndexedSeq
				else IndexedSeq.empty
			}
		}

	private val expectedDimentionNames: Set[String] =
		import variables.*
		(Seq(dateVar, latVar, lonVar) ++ elevationVar).map(_.dimName).toSet

	private def isSpatiotempVar(v: Variable): Boolean =
		v.getDimensions.asScala.map(_.getShortName).toSet == expectedDimentionNames



	def getVariables: IndexedSeq[String] = withDataset{ds =>
		ds.getVariables.asScala.collect{
			case v if isSpatiotempVar(v) => v.getShortName
		}.toIndexedSeq
	}

	def getRaster(dateTimeIdx: Int, varName: String, elevationIdx: Option[Int]): Raster = withDataset{ds =>

		val (ncVar, origin, size) = findVarPrepareSection(ds, varName, elevationIdx)

		val dateDimInd = ncVar.findDimensionIndex(variables.dateVar.dimName)
		val lonDimInd = ncVar.findDimensionIndex(variables.lonVar.dimName)
		val latDimInd = ncVar.findDimensionIndex(variables.latVar.dimName)

		val sizeLon = ncVar.getDimension(lonDimInd).getLength
		val sizeLat = ncVar.getDimension(latDimInd).getLength
		val latFirst = latDimInd < lonDimInd

		val dateVar = ds.findVariable(variables.dateVar.name)

		origin(dateDimInd) = dateTimeIdx
		origin(lonDimInd) = 0
		origin(latDimInd) = 0

		size(dateDimInd) = 1
		size(lonDimInd) = sizeLon
		size(latDimInd) = sizeLat

		val sec = new Section(origin, size)

		val arrFullDim = ncVar.read(sec)
		val fullMin = MAMath.getMinimum(arrFullDim)
		val fullMax = MAMath.getMaximum(arrFullDim)

		val rect = Using(new ucar.nc2.dt.grid.GridDataset(ds))(_.getBoundingBox()).get

		val bbox = BoundingBox(
			latMin = rect.getLatMin,
			latMax = rect.getLatMax,
			lonMin = rect.getLonMin,
			lonMax = rect.getLonMax
		)

		val latValues = ds.findVariable(variables.latVar.name).read()
		val latSorted = latValues.getDouble(0) < latValues.getDouble(sizeLat - 1)

		Raster(arrFullDim, sizeLon, sizeLat, fullMin, fullMax, latFirst, latSorted, bbox)
	}

	private def findVarPrepareSection(
		ds: NetcdfDataset, varName: String, elevationIdxOpt: Option[Int]
	): (Variable, Array[Int], Array[Int]) =

		val ncVar = ds.findVariable(varName)
		if(ncVar == null) throw new IllegalArgumentException(s"Variable $varName was not found in file ${ncFile.getFileName}")

		val dimCount: Int = ncVar.getRank

		if dimCount < 3 || dimCount > 4 then throw new IllegalArgumentException(
			s"Variable $varName contains an illegal number of dimensions $dimCount (only 3 or 4 are accepted)"
		)

		val origin, size = Array.ofDim[Int](dimCount)

		for
			elevationIdx <- elevationIdxOpt
			_ = if dimCount < 4 then throw new IllegalArgumentException(
				s"Variable $varName contains an illegal number of dimensions $dimCount (at least 4 are needed for elevations)"
			)
			elevVar <- variables.elevationVar
		do
			val elevationDim = ds.findDimension(elevVar.dimName)
			if elevationIdx >= elevationDim.getLength then
				throw new IndexOutOfBoundsException(s"Too big elevation index $elevationIdx")
			val elevationDimInd = ncVar.findDimensionIndex(elevVar.dimName)
			origin(elevationDimInd) = elevationIdx
			size(elevationDimInd) = 1

		(ncVar, origin, size)
	end findVarPrepareSection


	def getTemporalCrossSection(
		varName: String, latInd: Int, lonInd: Int, elevationIdx: Option[Int]
	): IndexedSeq[Double] = withDataset{ds =>

		val (ncVar, origin, size) = findVarPrepareSection(ds, varName, elevationIdx)

		val dateDimInd = ncVar.findDimensionIndex(variables.dateVar.dimName)
		val lonDimInd = ncVar.findDimensionIndex(variables.lonVar.dimName)
		val latDimInd = ncVar.findDimensionIndex(variables.latVar.dimName)

		val sizeDate = ncVar.getDimension(dateDimInd).getLength
		val sizeLat = ncVar.getDimension(latDimInd).getLength

		val latValues = ds.findVariable(variables.latVar.name).read()
		val latSorted: Boolean = latValues.getDouble(0) < latValues.getDouble(sizeLat - 1)

		origin(dateDimInd) = 0
		origin(lonDimInd) = lonInd
		origin(latDimInd) = if latSorted then latInd else sizeLat - 1 - latInd

		size(dateDimInd) = sizeDate
		size(lonDimInd) = 1
		size(latDimInd) = 1

		val sec = new Section(origin, size)
		val arrFullDim = ncVar.read(sec)

		arrFullDim.get1DJavaArray(DataType.DOUBLE).asInstanceOf[Array[Double]].toIndexedSeq
	}

end NetCdfViewService
