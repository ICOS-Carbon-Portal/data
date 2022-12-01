package se.lu.nateko.cp.data.formats.netcdf

import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.ValueFormatParser
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.bintable.ValueParser
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.NetCdfViewServiceImpl
import se.lu.nateko.cp.meta.core.data.TabularIngestionExtract
import se.lu.nateko.cp.meta.core.data.TimeInterval
import se.lu.nateko.cp.meta.core.data.TimeSeriesExtract
import ucar.nc2.Group
import ucar.nc2.Variable
import ucar.nc2.dataset.CoordinateAxis1DTime
import ucar.nc2.dataset.NetcdfDataset
import ucar.nc2.dataset.NetcdfDatasets
import ucar.nc2.dataset.VariableDS

import java.nio.file.Path
import java.time.Instant
import java.util.Formatter
import java.util.Locale
import scala.collection.JavaConverters._
import scala.collection.immutable.Iterable
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import ObspackNcToBinTable.TypedVar

class ObspackNcToBinTable private(netCdfDataset: NetcdfDataset, rowFactory: () => LazyList[BinTableRow], columnsMeta: ColumnsMeta, nRows: Long) extends AutoCloseable {

	def getIngestionExtract(): TimeSeriesExtract =
		val sampleTimes = netCdfDataset.findVariable("time").read()
		
		val start = Instant.ofEpochSecond(sampleTimes.getLong(0))
		val stop = Instant.ofEpochSecond(sampleTimes.getLong(nRows.toInt - 1))

		val ingestionExtract = TabularIngestionExtract(None, TimeInterval(start, stop)) // TODO: add actualColumns

		TimeSeriesExtract(ingestionExtract, Some(nRows.toInt))

	def readRows(): Iterable[BinTableRow] = rowFactory()

	def close(): Unit = netCdfDataset.close()

}

object ObspackNcToBinTable:
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
			val sortedVars: IndexedSeq[TypedVar] = allVars.sortBy(_.getShortName).flatMap{v =>
				colsMeta.matchColumn(v.getShortName).map(vf => v -> vf)
			}

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
						readNumeric(v, nullValue, _ getInt _)
					case FloatValue =>
						readNumeric(v, nullValue, _ getFloat _)
					case DoubleValue =>
						readNumeric(v, nullValue, _ getDouble _)
					case Iso8601DateTime =>
						val sb = new StringBuilder();
						val formatter = new Formatter(Locale.ENGLISH);
						val group = new Group(netCdfDataset, null, "x07") // deprecated constructor, TODO: Find alternative
						val sliceAxis = CoordinateAxis1DTime.factory(netCdfDataset, VariableDS.builder().copyFrom(v).build(group), formatter);

						sliceAxis.getCalendarDates().asScala.map(calendarDate => calendarDate.toString())
					case _ => throw new CpDataParsingException(
						s"Support for value format $vf in Netcdf has not been implemented yet"
					)
			}.toArray

			new ObspackNcToBinTable(netCdfDataset, () => LazyList.tabulate(nRows.toInt){i =>
				val cells = cellsLookup.map(_.apply(i))
				BinTableRow(cells, schema)
			},
			colsMeta,
			nRows)
		}
	end apply

	private def readNumeric[N <: Number](v: Variable, nullValue: AnyRef, getter: (ucar.ma2.Array, Int) => N): Int => AnyRef =
		val ncArr = v.read()
		var printedFillInfo = false
		Option(v.findAttribute("_FillValue")).map(_.getNumericValue).fold{
			(i: Int) => getter(ncArr, i)
		}{fill =>
			(i: Int) => {
				val value = getter(ncArr, i)
				// our nullValues are NaNs for Float and Double, so potentially
				// failed NaN == NaN comparison (see the next line) is not a problem
				if value == fill then nullValue else value
			}
		}

end ObspackNcToBinTable