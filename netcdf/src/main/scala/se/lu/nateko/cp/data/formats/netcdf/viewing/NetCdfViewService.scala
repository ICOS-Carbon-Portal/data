package se.lu.nateko.cp.data.formats.netcdf.viewing

import java.nio.file.Path
import scala.util.Using
import ucar.nc2.time.CalendarDate
import ucar.nc2.dataset.NetcdfDataset
import ucar.nc2.dataset.NetcdfDatasets
import java.io.IOException
import ucar.nc2.Variable
import ucar.ma2.ArrayFloat
import scala.collection.mutable.Buffer
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.time.Calendar
import ucar.ma2.Section
import ucar.ma2.MAMath
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.RasterImpl
import ucar.ma2.DataType

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


class NetCdfViewService(ncFile: Path, conf: NetCdfViewServiceConfig):

	private val dimensions = new DimensionSpecification(null, null, null, null)

	private val variables = new VariableSpecification(null, null, null, null)

	withDataset{ds =>
		def firstVarByName(nameOptions: Seq[String]): Option[String] =
			nameOptions.find(varName => ds.findVariable(varName) != null)

		firstVarByName(conf.dateVars).map(variables.setDateVariable)
		firstVarByName(conf.latitudeVars).map(variables.setLatVariable)
		firstVarByName(conf.longitudeVars).map(variables.setLonVariable)
		firstVarByName(conf.elevationVars).map(variables.setElevationVariable)

		dimensions.setDateDimension(
				ds.findVariable(variables.getDateVariable).getDimension(0).getShortName)
		dimensions.setLatDimension(
				ds.findVariable(variables.getLatVariable).getDimension(0).getShortName)
		dimensions.setLonDimension(
				ds.findVariable(variables.getLonVariable).getDimension(0).getShortName)

		val elevVar = variables.getElevationVariable
		if(elevVar != null) dimensions.setElevationDimension(
			ds.findVariable(elevVar).getDimension(0).getShortName
		)

	}



	private def withDataset[R](action: NetcdfDataset => R): R =
		val pathStr = ncFile.toAbsolutePath.toString
		Using(NetcdfDatasets.openDataset(pathStr))(action).fold({
			case exc: Throwable =>
				throw new IOException(s"Problem reading netcdf $pathStr", exc)
		}, identity)


	def getAvailableDates: IndexedSeq[CalendarDate] = withDataset{ds =>
		val timeVar = ds.findVariable(variables.dateVariable)
		NetCdfViewService.readAllDates(timeVar)
	}

	def getAvailableElevations(varName: String): IndexedSeq[Float] =
		if (variables.elevationVariable != null) {
			withDataset{ds =>

				// First see if this requested variable contains the elevation dimension
				// TODO: This requires that the variable name is the same as the dimension name
				val reqVar: Variable = ds.findVariable(varName)
				val dimIndex: Int = reqVar.findDimensionIndex(variables.elevationVariable)

				if dimIndex > 0 then
					// It does. Continue to extract values from variable
					val ncVar = ds.findVariable(variables.elevationVariable)
					val data = ncVar.read().asInstanceOf[ArrayFloat]
					data.copyTo1DJavaArray().asInstanceOf[Array[Float]].toIndexedSeq
				else IndexedSeq.empty
			}
		}
		else IndexedSeq.empty


	def getVariables: IndexedSeq[String] = withDataset{ds =>

		val varList = Buffer.empty[String]

		ds.getVariables.forEach{v =>
			//TODO: Make this more dynamic (order of dimensions)
			if v.getRank == 3
					&& v.getDimension(0).getShortName == dimensions.getDateDimension
					&& v.getDimension(1).getShortName == dimensions.getLatDimension
					&& v.getDimension(2).getShortName == dimensions.getLonDimension
			then varList += v.getShortName
			else if v.getRank == 3
					&& v.getDimension(0).getShortName == dimensions.getDateDimension
					&& v.getDimension(1).getShortName == dimensions.getLonDimension
					&& v.getDimension(2).getShortName == dimensions.getLatDimension
			then varList += v.getShortName
			else if v.getRank == 4
					&& v.getDimension(0).getShortName == dimensions.getDateDimension
					&& v.getDimension(1).getShortName == dimensions.getElevationDimension
					&& v.getDimension(2).getShortName == dimensions.getLatDimension
					&& v.getDimension(3).getShortName == dimensions.getLonDimension
			then varList += v.getShortName
		}

		varList.toIndexedSeq

	}

	def getRaster(dateTimeIdx: Int, varName: String, elevationIdx: Option[Int]): Raster = withDataset{ds =>

		val (ncVar, origin, size) = findVarPrepareSection(ds, varName, elevationIdx)

		val dateDimInd = ncVar.findDimensionIndex(dimensions.getDateDimension)
		val lonDimInd = ncVar.findDimensionIndex(dimensions.getLonDimension)
		val latDimInd = ncVar.findDimensionIndex(dimensions.getLatDimension)

		val sizeLon = ncVar.getDimension(lonDimInd).getLength
		val sizeLat = ncVar.getDimension(latDimInd).getLength
		val latFirst = latDimInd < lonDimInd

		val dateVar = ds.findVariable(variables.dateVariable)

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

		val griddataset = new ucar.nc2.dt.grid.GridDataset(ds)
		val latLonRect = griddataset.getBoundingBox()

		val latMin = latLonRect.getLatMin
		val latMax = latLonRect.getLatMax
		val lonMin = latLonRect.getLonMin
		val lonMax = latLonRect.getLonMax

		val latValues = ds.findVariable(variables.getLatVariable).read()
		val latSorted = latValues.getDouble(0) < latValues.getDouble(sizeLat - 1)

		griddataset.close()

		RasterImpl(arrFullDim, sizeLon, sizeLat, fullMin, fullMax, latFirst, latSorted, latMin, latMax, lonMin, lonMax)

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

		elevationIdxOpt.foreach{elevationIdx =>
			if dimCount < 4 then throw new IllegalArgumentException(
				s"Variable $varName contains an illegal number of dimensions $dimCount (at least 4 are needed for elevations)"
			)
			val elevationDim = ds.findDimension(dimensions.elevationDimension)
			if elevationIdx >= elevationDim.getLength then
				throw new IndexOutOfBoundsException(s"Too big elevation index $elevationIdx")
			val elevationDimInd = ncVar.findDimensionIndex(dimensions.getElevationDimension)
			origin(elevationDimInd) = elevationIdx
			size(elevationDimInd) = 1
		}

		(ncVar, origin, size)
	end findVarPrepareSection


	def getTemporalCrossSection(
		varName: String, latInd: Int, lonInd: Int, elevationIdx: Option[Int]
	): IndexedSeq[Double] = withDataset{ds =>

		val (ncVar, origin, size) = findVarPrepareSection(ds, varName, elevationIdx)

		val dateDimInd = ncVar.findDimensionIndex(dimensions.getDateDimension)
		val lonDimInd = ncVar.findDimensionIndex(dimensions.getLonDimension)
		val latDimInd = ncVar.findDimensionIndex(dimensions.getLatDimension)

		val sizeDate = ncVar.getDimension(dateDimInd).getLength
		val sizeLat = ncVar.getDimension(latDimInd).getLength

		val latValues = ds.findVariable(variables.getLatVariable).read()
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
