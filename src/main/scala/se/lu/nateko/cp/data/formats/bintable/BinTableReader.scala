package se.lu.nateko.cp.data.formats.bintable

import se.lu.nateko.cp.data.formats.bintable.DataType.*

import java.io.BufferedInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.ObjectInputStream
import java.nio.Buffer
import java.nio.ByteBuffer
import java.nio.channels.Channels
import java.nio.channels.FileChannel.MapMode

class BinTableReader(f: File, schema: Schema) extends BinTableFile(f, "r", schema):

	private val stringDictionary: Seq[String] =
		if(schema.hasStringColumn)
			val file = openRAF()
			file.seek(columnOffsets.last)
			val is: InputStream = new BufferedInputStream(Channels.newInputStream(file.getChannel()))
			val ois = new ObjectInputStream(is)
			try
				val nStrings: Int = ois.readInt()
				Vector.range(0, nStrings).map(_ => ois.readUTF)
			finally
				ois.close()
		else
			Vector.empty

	def read(column: Int): Buffer =
		ensureSizeIsInteger()
		read(column, 0, schema.size.asInstanceOf[Int])

	def readBytes(column: Int): ByteBuffer =
		ensureSizeIsInteger()
		readBytes(column, 0, schema.size.asInstanceOf[Int])

	private def ensureSizeIsInteger(): Unit =
		if(schema.size > Integer.MAX_VALUE)
			throw new IOException("The table is too large, cannot read whole column into a buffer")

	def readBytes(column: Int, offset: Long, size: Int): ByteBuffer =
		val dt: DataType = schema.columns(column)

		val valueSize: Int = dt.byteSize
		val byteOffset: Long = columnOffsets(column) + offset * valueSize
		val byteSize: Int = valueSize * size

		if(byteSize < 10000)
			file.seek(byteOffset)
			val barray: Array[Byte] = new Array[Byte](byteSize)
			file.read(barray)
			return ByteBuffer.wrap(barray)
		else
			return file.getChannel().map(MapMode.READ_ONLY, byteOffset, byteSize)

	def read(column: Int, offset: Long, size: Int): Buffer =
		val bytes: ByteBuffer = readBytes(column, offset, size)
		val dt: DataType = schema.columns(column)

		dt match
			case INT => bytes.asIntBuffer()
			case FLOAT => bytes.asFloatBuffer()
			case DOUBLE => bytes.asDoubleBuffer()
			case SHORT => bytes.asShortBuffer()
			case CHAR => bytes.asCharBuffer()
			case BYTE => bytes
			case STRING => bytes.asIntBuffer()

	def getStringForIndex(index: Int): String = stringDictionary(index)

	