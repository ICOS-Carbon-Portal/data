package se.lu.nateko.cp.data.services.fetch

import java.io.File
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.data.formats.bintable.Schema
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.bintable.BinTableSlice
import scala.concurrent.Future
import se.lu.nateko.cp.data.formats.bintable.BinTableSource

case class BinTableRequest(
	tableId: Sha256Sum,
	schema: Schema,
	columnNumbers: Seq[Int],
	slice: Option[BinTableSlice]
)

class FromBinTableFetcher(folder: File){

	assert(folder.isDirectory, "BinTable folder path must be a directory: " + folder.getAbsolutePath)

	def getSource(request: BinTableRequest): Source[ByteString, Future[Unit]] = {
		val file = new File(folder, request.tableId.id)

		BinTableSource(file, request.schema, request.columnNumbers, request.slice)
	}
}
