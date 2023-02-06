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

class ViewServiceFactory(folder: Path, config: NetCdfViewServiceConfig):
	def getNetCdfFiles(): IndexedSeq[String] =
		folder.toFile.list((_, fn) => fn.endsWith(".nc")).toIndexedSeq

	def getNetCdfViewService(fileName: String) =
		NetCdfViewService(folder.resolve(fileName), config)


object NetCdfViewService:
	val MaxDiscrDimSize = 100

	private class VarSpec(
		val dateVar: OneDimVar, val latVar: OneDimVar,
		val lonVar: OneDimVar, val previewables: IndexedSeq[VariableInfo]
	)

	private case class OneDimVar(name: String, dimName: String)

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

	private def getVarSpec(conf: NetCdfViewServiceConfig)(ds: NetcdfDataset): VarSpec =

		//val dims = ds.getDimensions.asScala.iterator.map(_.getShortName).toIndexedSeq
		val vars = ds.getVariables.asScala.toIndexedSeq

		val varsWithDims: Map[String, IndexedSeq[String]] = vars.iterator.map{v =>
			v.getShortName -> v.getDimensions.asScala.iterator.map(_.getShortName).toIndexedSeq
		}.toMap

		val singleDimVarsAndDims: Map[String, OneDimVar] = varsWithDims.collect{
			case (vname, dims) if dims.length == 1 => vname -> OneDimVar(vname, dims(0))
		}

		val simpleDescribedDims = singleDimVarsAndDims.valuesIterator.map(_.dimName).toSet

		val maybeNcharDim = varsWithDims.valuesIterator.flatten //all dimensions
			.filterNot(simpleDescribedDims.contains).toSet

		val charDiscrDims: Seq[DiscriminatingDimension] = vars.flatMap{v =>
			val dt = v.getDataType
			 if dt == DataType.CHAR || dt == DataType.STRING then
				val shape = v.getShape
				if shape.length == 2 && shape(0) <= MaxDiscrDimSize && shape(1) < 500 then
					varsWithDims.get(v.getShortName).collect{
						case dims if maybeNcharDim.contains(dims(1)) =>
							val dimName = dims(0)
							val charRange = 0 until shape(1)
							val varr = v.read()
							val idx = varr.getIndex()
							val labels = for labelIdx <- 0 until shape(0) yield
								charRange.map(charIdx => varr.getObject(idx.set(labelIdx, charIdx))).mkString
							DiscriminatingDimension(dimName, labels)
					}
				else None
			else None
		}

		val simpleDiscrDims: Seq[DiscriminatingDimension] = vars.flatMap{v =>
			singleDimVarsAndDims.get(v.getShortName).collect{
				case oneDimVar if v.getShape()(0) <= MaxDiscrDimSize =>
					val varr = v.read()
					val idx = varr.getIndex()
					val labels = for lidx <- 0 until idx.getShape()(0)
						yield varr.getObject(idx.set(lidx)).toString
					DiscriminatingDimension(oneDimVar.dimName, labels)
			}
		}

		val discrDims = (charDiscrDims ++ simpleDiscrDims).toIndexedSeq

		def findOneDimVar(kind: String, options: Seq[String]): OneDimVar =
			options.flatMap(singleDimVarsAndDims.get).headOption.getOrElse(
				throw new Exception(s"No $kind one-dimensional variable found in NetCDF. Expected one of: ${options.mkString(", ")}")
			)

		val dateVar = findOneDimVar("date", conf.dateVars)
		val latVar = findOneDimVar("latitude", conf.latitudeVars)
		val lonVar = findOneDimVar("longitude", conf.longitudeVars)

		val mandatoryDimensionNames: Set[String] = Iterator(dateVar, latVar, lonVar).map(_.dimName).toSet
		val previewableVars = vars.flatMap{v =>
			val dimNames = varsWithDims.get(v.getShortName).iterator.flatten.toSet

			if mandatoryDimensionNames.forall(dimNames.contains) &&
				dimNames.size <= mandatoryDimensionNames.size + 1
			then
				val discrDim = dimNames.diff(mandatoryDimensionNames).iterator
					.flatMap{dimName => discrDims.find(_.name == dimName)}
					.toSeq.headOption

				if discrDim.size == dimNames.size - mandatoryDimensionNames.size then
					Some(VariableInfo(v.getShortName, v.getFullName, discrDim))
				else None
			else None
		}
		VarSpec(dateVar, latVar, lonVar, previewableVars)
	end getVarSpec

end NetCdfViewService


case class DiscriminatingDimension(name: String, labels: IndexedSeq[String])
case class VariableInfo(shortName: String, longName: String, extra: Option[DiscriminatingDimension])


class NetCdfViewService(ncFile: Path, conf: NetCdfViewServiceConfig):
	import NetCdfViewService.*

	private val variables: VarSpec = withDataset(getVarSpec(conf))

	def withDataset[R](action: NetcdfDataset => R): R =
		val pathStr = ncFile.toAbsolutePath.toString
		Using(NetcdfDatasets.openDataset(pathStr))(action).fold({
			case exc: Throwable =>
				throw new IOException(s"Problem reading netcdf $pathStr", exc)
		}, identity)


	def getAvailableDates: IndexedSeq[CalendarDate] = withDataset{ds =>
		val timeVar = ds.findVariable(variables.dateVar.name)
		NetCdfViewService.readAllDates(timeVar)
	}

	def getVariables: IndexedSeq[VariableInfo] = variables.previewables

	def getRaster(dateTimeIdx: Int, varName: String, extraIdx: Option[Int]): Raster = withDataset{ds =>

		val (ncVar, origin, size) = findVarPrepareSection(ds, varName, extraIdx)

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
		ds: NetcdfDataset, varName: String, extraIdxOpt: Option[Int]
	): (Variable, Array[Int], Array[Int]) =

		val varInfo = variables.previewables.find(_.shortName == varName).getOrElse(
			throw new IllegalArgumentException(s"No previewable variable $varName was found in file ${ncFile.getFileName}")
		)
		val ncVar = ds.findVariable(varName)
		if(ncVar == null) throw new IllegalArgumentException(s"Variable $varName was not found in file ${ncFile.getFileName}")

		val dimCount: Int = ncVar.getRank

		if dimCount < 3 || dimCount > 4 then throw new IllegalArgumentException(
			s"Variable $varName contains an illegal number of dimensions $dimCount (only 3 or 4 are accepted)"
		)

		val origin, size = Array.ofDim[Int](dimCount)

		for
			extraIdx <- extraIdxOpt;
			_ = if dimCount < 4 then throw new IllegalArgumentException(
				s"Variable $varName contains an illegal number of dimensions $dimCount (at least 4 are needed for extra dimensions)"
			);
			extraDim <- varInfo.extra
		do
			val extraDimDs = ds.findDimension(extraDim.name)
			if extraIdx >= extraDimDs.getLength then
				throw new IndexOutOfBoundsException(s"Too big extra dimension value index $extraIdx")
			val extraDimInd = ncVar.findDimensionIndex(extraDim.name)
			origin(extraDimInd) = extraIdx
			size(extraDimInd) = 1

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
