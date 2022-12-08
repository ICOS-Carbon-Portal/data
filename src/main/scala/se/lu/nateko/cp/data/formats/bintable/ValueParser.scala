package se.lu.nateko.cp.data.formats.bintable

case class ValueParser():
	def parse(value: String, dtype: DataType) =
		dtype match {
		case DataType.INT => Integer.parseInt(value)
		case DataType.STRING => value
		case DataType.FLOAT =>
			val flt = value.toFloat
			if flt.isInfinite() then throw new NumberFormatException(value + " is outside the range for Float.")
			else flt
		case DataType.DOUBLE =>
			val dbl = value.toDouble
			if dbl.isInfinite() then throw new NumberFormatException(value + " is outside the range for Double.")
			else dbl
		case DataType.BYTE =>
			try {
				value.toByte
			} catch {
				case e: NumberFormatException => throw new NumberFormatException("Could not parse " + value + " to BYTE")
			}
		case DataType.SHORT =>
			try {
				value.toShort
			} catch {
				case e: NumberFormatException => throw new NumberFormatException("Could not parse " + value + " to SHORT")
			}
		case DataType.CHAR =>
			if (value.length() == 1) then value.charAt(0)
			else if(value.length() == 0) then Character.MIN_VALUE
			else throw new IllegalArgumentException("Value '" + value + "' is too long. Only one character is allowed.")
		case null => throw new RuntimeException("Unsupported datatype " + dtype)
	}

