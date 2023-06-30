package se.lu.nateko.cp.data.formats.netcdf

import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.ValueFormatParser
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewService.getDateParser
import se.lu.nateko.cp.meta.core.data.TabularIngestionExtract
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.TimeSeriesExtract
import ucar.nc2.Variable
import ucar.nc2.dataset.CoordinateAxisTimeHelper
import ucar.nc2.dataset.NetcdfDataset
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.time.Calendar
import ucar.nc2.time.CalendarDate

import java.nio.file.Path
import java.time.Instant
import scala.jdk.CollectionConverters.ListHasAsScala
import scala.collection.immutable.Iterable
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import ObspackNcToBinTable.TypedVar

class ObspackNcToBinTable private(
	netCdfDataset: NetcdfDataset,
	rowFactory: () => LazyList[BinTableRow],
	val extract: TimeSeriesExtract,
	val schema: Schema
) extends AutoCloseable {

	def readRows(): Iterable[BinTableRow] = rowFactory()

	def close(): Unit = netCdfDataset.close()

}

object ObspackNcToBinTable:
	import ValueFormat.*
	type TypedVar = (Variable, ValueFormat)

	def apply(file: Path, colsMeta: ColumnsMeta): Try[ObspackNcToBinTable] =

		val netCdfDataset = NetcdfDatasets.openDataset(file.toAbsolutePath.toString, false, null)

		val allVars = netCdfDataset.getVariables().asScala.toIndexedSeq
		val varNames = allVars.map(_.getShortName).toSeq
		val missingVars = colsMeta.findMissingColumns(varNames).map(_.toString)

		if !missingVars.isEmpty then Failure(new CpDataParsingException(
			s"Required variables were missing in the data: ${missingVars.mkString(", ")}"
		))
		else Try{
			val matchedVars: IndexedSeq[TypedVar] = allVars.flatMap{v =>
				colsMeta.matchColumn(v.getShortName).map(vf => v -> vf)
			}
			val sortedVars: IndexedSeq[TypedVar] = matchedVars.sortBy(_._1.getShortName)

			if sortedVars.isEmpty then throw new CpDataParsingException("No variables present to ingest")

			val ranks = sortedVars.map(_._1.getRank).distinct
			assert(ranks == IndexedSeq(1), s"Expected all ingested variables to have rank 1, instead the set of ranks was $ranks")

			val dimensions = sortedVars.map(_._1.getDimensionsString).distinct
			assert(dimensions.length == 1, s"Expected all ingested variables to have the same dimension, instead got the following: $dimensions")

			val v1 = sortedVars.head._1
			val nRows = v1.getSize
			assert(nRows <= Int.MaxValue, s"Too large number of rows $nRows, must be int, not long")

			val dtypes = sortedVars.map{case (_, vf) => ValueFormatParser.getBinTableDataType(vf)}
			val schema = new Schema(dtypes.toArray, nRows)

			val cellsLookup: Array[Int => AnyRef] = sortedVars.map{ (v, vf) =>
				import se.lu.nateko.cp.data.formats.*
				val nullValue = ValueFormatParser.getNullRepresentation(vf)
				vf match
					case IntValue =>
						readVal(v, nullValue, (ncArr, i) => Int.box(ncArr.getInt(i)))
					case FloatValue =>
						readVal(v, nullValue, (ncArr, i) => Float.box(ncArr.getFloat(i)))
					case DoubleValue =>
						readVal(v, nullValue, (ncArr, i) => Double.box(ncArr.getDouble(i)))
					case Iso8601DateTime =>
						val dateParser = getDateParser(v)
						readVal(v, nullValue, (ncArr, i) => {
							val calDate = dateParser(ncArr.getDouble(i))
							ValueFormatParser.encodeInstant(calDate.getMillis)
						})
					case ValueFormat.Utf16CharValue =>
						readVal(v, nullValue, (ncArr, i) => Char.box(ncArr.getChar(i)))
					case _ => throw new CpDataParsingException(
						s"Support for value format $vf in Netcdf has not been implemented yet"
					)
			}.toArray

			val tsVar = sortedVars.collectFirst{
				case (v, vf) if vf == Iso8601DateTime && v.getShortName == "time" => v
			}.getOrElse{
				val isoDts = sortedVars.collect{
					case (v, vf) if vf == Iso8601DateTime => v
				}
				isoDts.toList match
					case theOnly :: Nil => theOnly
					case Nil => throw CpDataParsingException("No timestamp variable found, cannot parse the file as time series")
					case _ => throw CpDataParsingException(
						"No 'time' variable found, but multiple ISO timestamps variables found, cannot choose: " +
							isoDts.map(_.getShortName).mkString(", ")
					)
			}

			val actualColumns =
				if colsMeta.hasAnyRegexCols || colsMeta.hasOptionalColumns
				then Some(matchedVars.map((v, _) => v.getShortName))
				else None

			val dateParser = getDateParser(tsVar)
			def getDate(idx: Int) = Instant.ofEpochMilli(dateParser(tsVar.read(Array(idx), Array(1)).getDouble(0)).getMillis)
			val startDate = getDate(0)
			val endDate = getDate(nRows.toInt - 1)

			val ingestionExtract = TabularIngestionExtract(actualColumns, TimeInterval(startDate, endDate))

			new ObspackNcToBinTable(
				netCdfDataset,
				() => LazyList.tabulate(nRows.toInt){i =>
					val cells = cellsLookup.map(_.apply(i))
					BinTableRow(cells, schema)
				},
				TimeSeriesExtract(ingestionExtract, Some(nRows.toInt)),
				schema
			)
		}
	end apply

	private def readVal[N <: AnyRef](v: Variable, nullValue: AnyRef, getter: (ucar.ma2.Array, Int) => N): Int => AnyRef =
		val ncArr = v.read()
		var printedFillInfo = false
		Option(v.findAttribute(NetcdfUtil.FillValueAttrName)).map(_.getNumericValue).fold{
			(i: Int) => getter(ncArr, i)
		}{fill =>
			(i: Int) =>
				val value = getter(ncArr, i)
				// our nullValues are NaNs for Float and Double, so potentially
				// failed NaN == NaN comparison (see the next line) is not a problem
				if value == fill then nullValue else value
		}



end ObspackNcToBinTable