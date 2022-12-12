package se.lu.nateko.cp.data.formats.bintable

import se.lu.nateko.cp.data.formats.bintable.DataType.*

import java.io.BufferedOutputStream
import java.io.File
import java.io.ObjectOutputStream
import java.io.OutputStream
import java.nio.Buffer
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.DoubleBuffer
import java.nio.FloatBuffer
import java.nio.IntBuffer
import java.nio.MappedByteBuffer
import java.nio.ShortBuffer
import java.nio.channels.Channels
import java.nio.channels.FileChannel.MapMode
import scala.collection.mutable.LinkedHashMap

class BinTableWriter(f: File, schema: Schema) extends BinTableFile(f, "rw", schema):

	val nCols = columnSizes.length

	file.setLength(columnOffsets(nCols)) //offset AFTER the last column

	private val buffers: Array[MappedByteBuffer] = new Array[MappedByteBuffer](nCols)

	private val typedBuffers: Array[Buffer] = new Array[Buffer](nCols)

	private val stringDictionary = LinkedHashMap.empty[String, Int]
	private var stringCount: Int = 0

	for(i <- 0 until nCols)

		buffers(i) = file.getChannel().map(MapMode.READ_WRITE, columnOffsets(i), columnSizes(i))

		val dt: DataType = schema.columns(i)

		dt match
			case INT =>
				typedBuffers(i) = buffers(i).asIntBuffer()
			case FLOAT =>
				typedBuffers(i) = buffers(i).asFloatBuffer()
			case DOUBLE =>
				typedBuffers(i) = buffers(i).asDoubleBuffer()
			case SHORT =>
				typedBuffers(i) = buffers(i).asShortBuffer()
			case CHAR =>
				typedBuffers(i) = buffers(i).asCharBuffer()
			case BYTE =>
				typedBuffers(i) = buffers(i)
			case STRING =>
				typedBuffers(i) = buffers(i).asIntBuffer()

	def writeRow(row: Array[AnyRef]): Unit =

		for (i <- 0 until schema.columns.length)
			val dt = schema.columns(i)
	
			dt match
				case INT =>
					typedBuffers(i).asInstanceOf[IntBuffer].put(row(i).asInstanceOf[Integer])
				case FLOAT =>
					typedBuffers(i).asInstanceOf[FloatBuffer].put(row(i).asInstanceOf[Float])
				case DOUBLE =>
					typedBuffers(i).asInstanceOf[DoubleBuffer].put(row(i).asInstanceOf[Double])
				case SHORT =>
					typedBuffers(i).asInstanceOf[ShortBuffer].put(row(i).asInstanceOf[Short])
				case CHAR =>
					typedBuffers(i).asInstanceOf[CharBuffer].put(row(i).asInstanceOf[Character])
				case BYTE =>
					typedBuffers(i).asInstanceOf[ByteBuffer].put(row(i).asInstanceOf[Byte])
				case STRING =>
					val s = row(i).asInstanceOf[String]
					val stringIndex = stringDictionary.getOrElseUpdate(s, {stringCount +=1; stringCount - 1})
					(typedBuffers(i).asInstanceOf[IntBuffer]).put(stringIndex)

	def write(p: Product): Unit =
	 	writeRow(p.productIterator.collect{case a: AnyRef => a}.toArray)

	override def close(): Unit =
		file.seek(file.length())

		val os: OutputStream = new BufferedOutputStream(Channels.newOutputStream(file.getChannel()))
		val oos: ObjectOutputStream = new ObjectOutputStream(os)
		oos.writeInt(stringCount)

		stringDictionary.keys.foreach(s => oos.writeUTF(s))

		for(buffer: MappedByteBuffer <- buffers)
			buffer.force()

		oos.close()
		file.close()

end BinTableWriter
