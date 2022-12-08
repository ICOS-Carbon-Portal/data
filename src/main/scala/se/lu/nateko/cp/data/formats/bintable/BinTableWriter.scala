package se.lu.nateko.cp.data.formats.bintable

import java.io.BufferedOutputStream
import java.io.File
import java.io.IOException
import java.io.ObjectOutputStream
import java.io.OutputStream
import java.nio.Buffer
import java.nio.IntBuffer
import java.nio.FloatBuffer
import java.nio.DoubleBuffer
import java.nio.ShortBuffer
import java.nio.CharBuffer
import java.nio.ByteBuffer
import java.nio.MappedByteBuffer
import java.nio.channels.Channels
import java.nio.channels.FileChannel.MapMode
import java.util.LinkedHashMap
import scala.collection.mutable.Seq

case class BinTableWriter(writeFile: File, schema: Schema) extends BinTableFile:

	private val file = super.file(writeFile, "rw")
	val nCols = columnSizes.length

	file.setLength(columnOffsets(nCols)) //offset AFTER the last column

	private val buffers: Array[MappedByteBuffer] = new Array[MappedByteBuffer](nCols)

	private val typedBuffers: Array[Buffer] = new Array[Buffer](nCols)

	private val stringDictionary: LinkedHashMap[String, Integer] = new LinkedHashMap[String, Integer]()
	private var stringCount = 0

	for(i <- 0 until nCols) {

		buffers(i) = file.getChannel().map(MapMode.READ_WRITE, columnOffsets(i), columnSizes(i))

		val dt: DataType = schema.columns(i)

		dt match {
			case DataType.INT =>
				typedBuffers(i) = buffers(i).asIntBuffer()
			case DataType.FLOAT =>
				typedBuffers(i) = buffers(i).asFloatBuffer()
			case DataType.DOUBLE =>
				typedBuffers(i) = buffers(i).asDoubleBuffer()
			case DataType.SHORT =>
				typedBuffers(i) = buffers(i).asShortBuffer()
			case DataType.CHAR =>
				typedBuffers(i) = buffers(i).asCharBuffer()
			case DataType.BYTE =>
				typedBuffers(i) = buffers(i)
			case DataType.STRING =>
				typedBuffers(i) = buffers(i).asIntBuffer()

			case null => throw Utils.unsupportedDatatypeException(dt)
		}
	}

	@throws(classOf[IOException])
	def writeRow(row: Seq[Object]): Unit =

		for (i <- 0 until schema.columns.length) {
			val dt = schema.columns(i)
	
			dt match {
				case DataType.INT =>
					typedBuffers(i).asInstanceOf[IntBuffer].put(row(i).asInstanceOf[Integer])
				case DataType.FLOAT =>
					typedBuffers(i).asInstanceOf[FloatBuffer].put(row(i).asInstanceOf[Float])
				case DataType.DOUBLE =>
					typedBuffers(i).asInstanceOf[DoubleBuffer].put(row(i).asInstanceOf[Double])
				case DataType.SHORT =>
					typedBuffers(i).asInstanceOf[ShortBuffer].put(row(i).asInstanceOf[Short])
				case DataType.CHAR =>
					typedBuffers(i).asInstanceOf[CharBuffer].put(row(i).asInstanceOf[Character])
				case DataType.BYTE =>
					typedBuffers(i).asInstanceOf[ByteBuffer].put(row(i).asInstanceOf[Byte])
				case DataType.STRING =>
					val s = row(i).asInstanceOf[String]
					var stringIndex = 0

					if(stringDictionary.containsKey(s))
						stringIndex = stringDictionary.get(s)
					else {
						stringIndex = stringCount
						stringDictionary.put(s, stringCount)
						stringCount += 1
					}
					(typedBuffers(i).asInstanceOf[IntBuffer]).put(stringIndex)
	
				case null => throw Utils.unsupportedDatatypeException(dt)
			}
		}

	@throws(classOf[IOException])
	override def close(): Unit =
		file.seek(file.length())

		val os: OutputStream = new BufferedOutputStream(Channels.newOutputStream(file.getChannel()))
		val oos: ObjectOutputStream = new ObjectOutputStream(os)
		oos.writeInt(stringCount)

		stringDictionary.keySet().forEach(s => oos.writeUTF(s))

		for(buffer: MappedByteBuffer <- buffers){
			buffer.force()
		}

		oos.close()
		file.close()

end BinTableWriter

