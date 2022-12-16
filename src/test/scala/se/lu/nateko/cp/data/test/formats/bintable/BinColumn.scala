package se.lu.nateko.cp.data.formats.bintable

import ucar.nc2.Variable
import ucar.ma2.{Array => CdmArray, DataType}
import scala.reflect.ClassTag
import scala.util.Try
import scala.util.Success
import scala.util.Failure
import java.nio.*

sealed trait BinColumn{ self =>
	type V
	def values: Iterator[V]

	def asInt: Try[IntColumn] = as[IntColumn]
	def asLong: Try[LongColumn] = as[LongColumn]
	def asFloat: Try[FloatColumn] = as[FloatColumn]
	def asDouble: Try[DoubleColumn] = as[DoubleColumn]
	def asString: Try[StringColumn] = as[StringColumn]

	def asShort: Try[ShortColumn] = as[ShortColumn]
	def asChar: Try[CharColumn] = as[CharColumn]
	def asBoolean: Try[BooleanColumn] = as[BooleanColumn]
	def asByte: Try[ByteColumn] = as[ByteColumn]

	private[this] def as[T <: BinColumn](using ct: ClassTag[T]): Try[T] = this match{
		case f: T => Success(f)
		case _ => Failure(new Error("The plain column was not of expected type " + ct.toString))
	}

	def map(f: V => String): StringColumn = new StringColumn { def values = self.values.map(f) }
}

trait IntColumn extends BinColumn{ type V = Int }
trait LongColumn extends BinColumn{ type V = Long }
trait FloatColumn extends BinColumn{ type V = Float }
trait DoubleColumn extends BinColumn{ type V = Double }
trait StringColumn extends BinColumn{ type V = String }

trait ShortColumn extends BinColumn{ type V = Short }
trait CharColumn extends BinColumn{ type V = Char }
trait BooleanColumn extends BinColumn{ type V = Boolean }
trait ByteColumn extends BinColumn{ type V = Byte }

object BinColumn{

	def apply(variable: Variable): Try[BinColumn] = Try{

		assert(variable.getRank == 1, "Expecting NetCDF variable rank to be 1 to convert to a plain column")

		val n = variable.getShape(0)

		def getValues[T](accessor: CdmArray => Int => T): Iterator[T] = {
			Range(0, n).iterator.map(n => {
				val arr = variable.read(Array(n), Array(1))
				accessor(arr)(0)
			})
		}

		variable.getDataType match{
			case DataType.INT => new IntColumn{ def values = getValues(_.getInt) }
			case DataType.FLOAT => new FloatColumn{ def values = getValues(_.getFloat) }
			case DataType.STRING => new StringColumn{ def values = getValues(arr => ind => arr.getObject(ind).asInstanceOf[String]) }
			case dt @ _ => throw new Exception("Unsupported NetCDF variable data type: " + dt.name)
		}

	}
	
	def apply(array: CdmArray): Try[BinColumn] = Try{

		assert(array.getRank == 1, "Expecting NetCDF variable rank to be 1 to convert to a plain column")

		val n = array.getShape.apply(0)

		def getValues[T](accessor: Int => T): Iterator[T] = {
			Range(0, n).iterator.map(accessor)
		}

		array.getDataType match{
			case DataType.INT => new IntColumn{ def values = getValues(array.getInt) }
			case DataType.FLOAT => new FloatColumn{ def values = getValues(array.getFloat) }
			case DataType.STRING => new StringColumn{ def values = getValues(ind => array.getObject(ind).asInstanceOf[String]) }
			case dt @ _ => throw new Exception("Unsupported NetCDF variable data type: " + dt.name)
		}

	}


	def apply(buffer: Buffer): Try[BinColumn] = Try{

		def iter[T](getter: => T): Iterator[T] = {
			buffer.rewind()
			Iterator.fill(buffer.limit)(getter)
		}

		buffer match {
			case intBuffer : IntBuffer => new IntColumn{ def values = iter(intBuffer.get) }
			case longBuffer : LongBuffer => new LongColumn{ def values = iter(longBuffer.get) }
			case floatBuffer : FloatBuffer => new FloatColumn{ def values = iter(floatBuffer.get) }
			case doubleBuffer : DoubleBuffer => new DoubleColumn{ def values = iter(doubleBuffer.get) }
			case charBuffer : CharBuffer => new CharColumn{ def values = iter(charBuffer.get) }
			case shortBuffer : ShortBuffer => new ShortColumn{ def values = iter(shortBuffer.get) }
			case byteBuffer : ByteBuffer => new ByteColumn{ def values = iter(byteBuffer.get) }

			case _ => throw new Exception("Unsupported buffer type " + buffer.getClass.getCanonicalName)
		}
	}

}