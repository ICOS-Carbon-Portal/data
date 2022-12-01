package se.lu.nateko.cp.data.formats.netcdf

import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.ValueFormatParser
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.formats.bintable.ValueParser
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.NetCdfViewServiceImpl
import ucar.nc2.Variable
import ucar.nc2.dataset.NetcdfDatasets

import java.nio.file.Path
import scala.collection.JavaConverters._
import scala.util.Try
import ucar.nc2.dataset.NetcdfDataset
import scala.util.Success
import scala.util.Failure
import se.lu.nateko.cp.data.api.CpDataParsingException
import ObspackNcToBinTable.TypedVar
import se.lu.nateko.cp.meta.core.data.TimeSeriesExtract
import scala.collection.immutable.Iterable

class ObspackNcToBinTable private(netCdfDataset: NetcdfDataset, rowFactory: () => LazyList[BinTableRow]) extends AutoCloseable {

	def getIngestionExtract(): TimeSeriesExtract = ???

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
						(i: Int) => {
							//TODO Read the timestamp, handle netcdf fill values (i.e. missing values)
							val timeStamp: java.time.Instant = ???
							ValueFormatParser.encodeInstant(timeStamp)
						}
					case _ => throw new CpDataParsingException(
						s"Support for value format $vf in Netcdf has not been implemented yet"
					)
			}.toArray

			new ObspackNcToBinTable(netCdfDataset, () => LazyList.tabulate(nRows.toInt){i =>
				val cells = cellsLookup.map(_.apply(i))
				BinTableRow(cells, schema)
			})
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