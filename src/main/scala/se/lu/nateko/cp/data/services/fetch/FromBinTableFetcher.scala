package se.lu.nateko.cp.data.services.fetch

import java.io.File

import scala.concurrent.Future

import akka.stream.scaladsl.Source
import akka.util.ByteString
import akka.Done
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

case class BinTableRequest(
	tableId: Sha256Sum,
	subFolder: String,
	schema: Schema,
	columnNumbers: Seq[Int],
	slice: Option[BinTableSlice]
)

class FromBinTableFetcher(folder: File){

	assert(folder.isDirectory, "BinTable folder path must be a directory: " + folder.getAbsolutePath)

	def getSource(request: BinTableRequest): Source[ByteString, Future[Done]] = {

		assert(!request.schema.hasStringColumn, "Only numeric BinTables can be fetched as binary data.")

		val file = new File(folder, request.subFolder + "/" + request.tableId.id + FileExtension)

		assert(file.exists, s"File ${file.getName} not found on the server")

		BinTableSource(file, request.schema, request.columnNumbers, request.slice)
	}

	def getResponseSize(request: BinTableRequest): Long = {
		import se.lu.nateko.cp.data.formats.bintable.Utils

		val nRows = request.slice.fold(request.schema.size)(_.length.toLong)
		request.columnNumbers.map{colNum =>
			val col = request.schema.columns(colNum)
			Utils.getDataTypeSize(col) * nRows
		}.sum
	}
}
