package se.lu.nateko.cp.data.formats.bintable

import akka.Done
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.SourceFromCloseableIterator

import java.io.File
import java.nio.ByteBuffer
import scala.concurrent.Future


case class BinTableSlice(offset: Long, length: Int)

object BinTableSource:

	val MAX_CHUNK_SIZE = 8192

	def apply(file: File, schema: Schema, cols: Seq[Int], slice: Option[BinTableSlice] = None): Source[ByteString, Future[Done]] =
		SourceFromCloseableIterator(() =>
			val binTblReader = new BinTableReader(file, schema)
			val byteStringIter = getColumns(binTblReader, cols, slice)
			(byteStringIter, binTblReader.close)
		)

	def getColumns(reader: BinTableReader, cols: Seq[Int], slice: Option[BinTableSlice]): Iterator[ByteString] =
		cols.iterator.flatMap(col =>

			val buffer: ByteBuffer = slice match
				case Some(bslice) => reader.readBytes(col, bslice.offset, bslice.length)
				case None => reader.readBytes(col)

			slices(buffer.capacity, MAX_CHUNK_SIZE).map{ length =>
				val arr = Array.ofDim[Byte](length)
				buffer.get(arr, 0, length)
				ByteString(arr)
			}
		)

	def slices(totalSize: Int, step: Int): Iterator[Int] =
		(0 until totalSize by step).iterator.map(offset =>
			val restSize = totalSize - offset
			val length = if(restSize > step) step else restSize
			length
		)
