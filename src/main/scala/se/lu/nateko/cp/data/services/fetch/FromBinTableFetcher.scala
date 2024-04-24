package se.lu.nateko.cp.data.services.fetch

import akka.Done
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.formats.bintable.*
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import java.io.File
import java.nio.file.Files
import java.time.Instant
import scala.concurrent.Future
import se.lu.nateko.cp.data.api.CpDataException

case class BinTableRequest(
	tableId: Sha256Sum,
	subFolder: String,
	schema: Schema,
	columnNumbers: Seq[Int],
	slice: Option[BinTableSlice]
)

class FromBinTableFetcher(upload: UploadService):

	private def parseMoratoriumDate(metaFile: File): Instant =
		val moratoriumStr = Files.readString(metaFile.toPath)
		Instant.parse(moratoriumStr)

	def getSource(request: BinTableRequest): Source[ByteString, Future[Done]] =

		assert(!request.schema.hasStringColumn, "Only numeric BinTables can be fetched as binary data.")

		val formatUri = CpMetaVocab.getRelative(request.subFolder)
		val origFile = upload.getFile(Some(formatUri), request.tableId, true)
		val file = CpbHandler.getCpbFileForReading(origFile.toPath).get.toFile

		BinTableSource(file, request.schema, request.columnNumbers, request.slice)


	def getResponseSize(request: BinTableRequest): Long = {

		val nRows = request.slice.fold(request.schema.size)(_.length.toLong)
		request.columnNumbers.map{colNum =>
			val col = request.schema.columns(colNum)
			col.byteSize * nRows
		}.sum
	}
