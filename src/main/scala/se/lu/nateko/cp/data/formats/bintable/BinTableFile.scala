package se.lu.nateko.cp.data.formats.bintable

import java.io.Closeable
import java.io.File
import java.io.RandomAccessFile

trait BinTableFile extends Closeable:
	val schema: Schema

	def file(file: File, accessType: String) = new RandomAccessFile(file, accessType)

	protected val columnSizes = schema.columns.map(col => schema.size * col.byteSize)
	protected val columnOffsets = columnSizes.scan(0L)(_ + _)
	protected val columnValueSizes = schema.columns.map(_.byteSize)

