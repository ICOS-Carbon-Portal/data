package se.lu.nateko.cp.data.formats.bintable

import akka.Done
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.formats.bintable.DataType._
import se.lu.nateko.cp.data.streams.SourceFromCloseableIterator

import java.io.File
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.DoubleBuffer
import java.nio.FloatBuffer
import java.nio.IntBuffer
import java.nio.ShortBuffer
import scala.concurrent.Future


class BinTableRowReader(file: File, schema: Schema) {

	assert(file.exists(), s"File ${file.getName} was not found on the server")
	assert(!schema.hasStringColumn, "string-value columns in BinTable are not supported in BinTableRowReader")

	def rows(columns: Array[Int]): Source[Array[AnyVal], Future[Done]] = rows(columns, 0L)

	def rows(columns: Array[Int], offset: Long): Source[Array[AnyVal], Future[Done]] = {
		val sizeLong = schema.size - offset

		assert(sizeLong >= 0, "offset to large when reading BinTable slice")
		assert(sizeLong <= Int.MaxValue, "attempting to read too big slice of BinTable")

		rows(columns, offset, sizeLong.toInt)
	}

	def rows(columns: Array[Int], offset: Long, limit: Int): Source[Array[AnyVal], Future[Done]] = SourceFromCloseableIterator(() => {

		val reader = new BinTableReader(file, schema)

		val cellReaders: Array[() => AnyVal] = columns.map{colIdx =>
				val buf = reader.read(colIdx, offset, limit)
				schema.columns(colIdx) match {
					case FLOAT  => buf.asInstanceOf[FloatBuffer].get
					case BYTE   => buf.asInstanceOf[ByteBuffer].get
					case SHORT  => buf.asInstanceOf[ShortBuffer].get
					case CHAR   => buf.asInstanceOf[CharBuffer].get
					case DOUBLE => buf.asInstanceOf[DoubleBuffer].get
					case INT    => buf.asInstanceOf[IntBuffer].get
					case STRING => throw new IllegalStateException("String BinTable columns are not supported")
				}
		}

		var n = 0L
		val iter = Iterator.continually{n += 1; n}.takeWhile(_ <= limit).map{_ =>
			cellReaders.map(_.apply())
		}

		(iter, reader.close)
	})
}
