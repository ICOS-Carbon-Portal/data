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

case class BinTableReader(readFile: File, schema: Schema) extends BinTableFile:

	private var stringDictionary: Seq[String] = Vector.empty
	private var ois: Option[ObjectInputStream] = None
	private val file = super.file(readFile, "r")

	if(schema.hasStringColumn)
		file.seek(columnOffsets(schema.columns.length))

		val is: InputStream = new BufferedInputStream(Channels.newInputStream(file.getChannel()))
		ois = Some(new ObjectInputStream(is))

		val nStrings: Int = ois.fold(0)(_.readInt())
		stringDictionary = Vector.range(0, nStrings).map(_ => ois.get.readUTF)

	else
		stringDictionary = Vector.empty
		ois = None

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

	override def close(): Unit =
		for (stream <- ois) yield stream.close()
		file.close()
