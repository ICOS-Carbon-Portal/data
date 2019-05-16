package se.lu.nateko.cp.data.formats.bintable;

public class ValueParser {

	public ValueParser(){}

	public Object parse(String value, DataType dtype){
		switch(dtype){
			case INT:
				return Integer.parseInt(value);
			case STRING: return value;
			case FLOAT:
				Float flt = Float.parseFloat(value);
				if (flt.isInfinite())
					throw new NumberFormatException(value + " is outside the range for Float.");
				else
					return flt;
			case DOUBLE: 
				Double dbl = Double.parseDouble(value);
				if(dbl.isInfinite())
					throw new NumberFormatException(value + " is outside the range for Double.");
				else
					return dbl;
			case BYTE:
				try {
					return Byte.parseByte(value);
				} catch (NumberFormatException e) {
					throw new NumberFormatException("Could not parse " + value + " to BYTE");
				}
			case SHORT:
				try {
					return Short.parseShort(value);
				} catch (NumberFormatException e) {
					throw new NumberFormatException("Could not parse " + value + " to SHORT");
				}
			case CHAR: 
				if (value.length() == 1)
					return value.charAt(0);
				else if(value.length() == 0)
					return Character.MIN_VALUE;
				else
					throw new IllegalArgumentException("Value '" + value + "' is too long. Only one character is allowed.");

			default: throw new RuntimeException("Unsupported datatype " + dtype); 
		}
	}
}
