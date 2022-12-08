package se.lu.nateko.cp.data.formats.bintable

import java.io.Closeable
import java.io.File
import java.io.FileNotFoundException
import java.io.RandomAccessFile

trait BinTableFile extends Closeable {
	val schema: Schema

	def file(file: File, accessType: String) = new RandomAccessFile(file, accessType)
	protected val columnSizes = Utils.getColumnSizes(schema)
	protected val columnOffsets = Utils.getColumnByteOffsets(columnSizes)
	protected val columnValueSizes = Utils.getColumnValueSizes(schema)

}
