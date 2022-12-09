package se.lu.nateko.cp.data.formats.bintable

import java.io.File
import java.io.RandomAccessFile

trait BinTableFile(f: File, accessType: String, schema: Schema) extends AutoCloseable:

	protected val file = openRAF()

	protected val columnSizes = schema.columns.map(col => schema.size * col.byteSize)
	protected val columnOffsets = columnSizes.scan(0L)(_ + _)
	protected val columnValueSizes = schema.columns.map(_.byteSize)

	protected def openRAF() = new RandomAccessFile(f, accessType)

	override def close(): Unit = file.close()
