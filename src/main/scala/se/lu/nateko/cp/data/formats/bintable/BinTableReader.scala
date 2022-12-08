package se.lu.nateko.cp.data.formats.bintable

import java.io.BufferedInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.ObjectInputStream
import java.nio.Buffer
import java.nio.ByteBuffer
import java.nio.channels.Channels
import java.nio.channels.FileChannel.MapMode

@throws(classOf[IOException])
case class BinTableReader(readFile: File, schema: Schema) extends BinTableFile:

	private var stringDictionary: Seq[String] = Vector.empty
	private var ois: ObjectInputStream = null // make optional?
	private val file = super.file(readFile, "r")

	if(schema.hasStringColumn){
		file.seek(columnOffsets(schema.columns.length))

		val is: InputStream = new BufferedInputStream(Channels.newInputStream(file.getChannel()))
		ois = new ObjectInputStream(is)

		val nStrings: Int = ois.readInt()
		stringDictionary = Vector.range(0, nStrings).map(_ => ois.readUTF)

	} else{
		stringDictionary = Vector.empty
		ois = null
	}

	@throws(classOf[IOException])
	def read(column: Int): Buffer =
		ensureSizeIsInteger()
		read(column, 0, schema.size.asInstanceOf[Int])

	@throws(classOf[IOException])
	def readBytes(column: Int): ByteBuffer =
		ensureSizeIsInteger()
		readBytes(column, 0, schema.size.asInstanceOf[Int])

	@throws(classOf[IOException])
	private def ensureSizeIsInteger(): Unit =
		if(schema.size > Integer.MAX_VALUE)
			throw new IOException("The table is too large, cannot read whole column into a buffer")

	@throws(classOf[IOException])
	def readBytes(column: Int, offset: Long, size: Int): ByteBuffer =
		val dt: DataType = schema.columns(column)

		val valueSize: Int = Utils.getDataTypeSize(dt)
		val byteOffset: Long = columnOffsets(column) + offset * valueSize
		val byteSize: Int = valueSize * size

		if(byteSize < 10000){
			file.seek(byteOffset)
			val barray: Array[Byte] = new Array[Byte](byteSize)
			file.read(barray)
			return ByteBuffer.wrap(barray)
		}else
			return file.getChannel().map(MapMode.READ_ONLY, byteOffset, byteSize)

	@throws(classOf[IOException])
	def read(column: Int, offset: Long, size: Int): Buffer =
		val bytes: ByteBuffer = readBytes(column, offset, size)

		val dt: DataType = schema.columns(column)

		dt match {
			case DataType.INT => bytes.asIntBuffer()
			case DataType.FLOAT => bytes.asFloatBuffer()
			case DataType.DOUBLE => bytes.asDoubleBuffer()
			case DataType.SHORT => bytes.asShortBuffer()
			case DataType.CHAR => bytes.asCharBuffer()
			case DataType.BYTE => bytes
			case DataType.STRING => bytes.asIntBuffer()
			case null => throw Utils.unsupportedDatatypeException(dt)
		}

	def getStringForIndex(index: Int): String = stringDictionary(index)

	@throws(classOf[IOException])
	override def close(): Unit =
		if(ois != null) ois.close()
		file.close()
