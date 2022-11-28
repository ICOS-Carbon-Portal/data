package se.lu.nateko.cp.data.formats.netcdf

import java.io.File
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.ColumnsMeta

class ObspackNcToBinTable(file: File, colsMeta: ColumnsMeta) {

	def readRows(): Iterable[BinTableRow] = ???

	def close(): Unit = ???

}
