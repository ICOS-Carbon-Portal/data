package se.lu.nateko.cp.data.formats.bintable

object Utils:

	def getColumnSizes(schema: Schema): Array[Long] =
		val res = new Array[Long](schema.columns.length)
		for(i <- 0 until res.length){
			res(i) = schema.size * getDataTypeSize(schema.columns(i))
		}
		return res;

	def getColumnByteOffsets(columnSizes: Array[Long]): Array[Long] =
		val res = new Array[Long](columnSizes.length + 1)
		res(0) = 0

		for(i <- 1 until res.length){
			res(i) = res(i - 1) + columnSizes(i - 1)
		}
		res

	def getColumnValueSizes(schema: Schema): Array[Int] =
		val res = new Array[Int](schema.columns.length)
		for(i <- 0 until res.length){
			res(i) = getDataTypeSize(schema.columns(i));
		}
		res

	def getDataTypeSize(dt: DataType): Int =
		dt match {
			case DataType.INT => 4
			case DataType.FLOAT => 4
			case DataType.DOUBLE => 8
			case DataType.SHORT => 2
			case DataType.CHAR => 2
			case DataType.BYTE => 1
			case DataType.STRING => 4
			case null => throw unsupportedDatatypeException(dt)
		}

	def unsupportedDatatypeException(dt: DataType): RuntimeException =
		new RuntimeException("Unsupported " + DataType.getClass.getCanonicalName() + " " + dt);

