package se.lu.nateko.cp.data.formats.netcdf

import java.nio.file.Path
import se.lu.nateko.cp.data.formats.bintable.BinTableRow
import se.lu.nateko.cp.data.formats.ColumnsMeta
import se.lu.nateko.cp.meta.core.data.TabularIngestionExtract
import scala.collection.immutable.Iterable

class ObspackNcToBinTable(file: Path, colsMeta: ColumnsMeta) extends AutoCloseable{

	def getIngestionExtract(): TabularIngestionExtract = ???

	def readRows(): Iterable[BinTableRow] = ???

	def close(): Unit = ???

}
