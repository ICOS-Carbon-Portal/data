package se.lu.nateko.cp.data.formats.bintable;

import java.text.DecimalFormatSymbols;
import java.text.NumberFormat;
import java.text.ParsePosition;
import java.util.Locale;


public class ValueParser {

	private final NumberFormat numberFormat;
	private final char decimalSeparator;

	public ValueParser(Locale loc){
		numberFormat = NumberFormat.getNumberInstance(loc);
		decimalSeparator = new DecimalFormatSymbols(loc).getDecimalSeparator();
	}

	public Number parseDecimal(String value){
		
		if ((decimalSeparator == ',' && value.contains(".")) || (decimalSeparator == '.' && value.contains(","))){
			throw new NumberFormatException("Bad decimal character in " + value + ". Expected '" + decimalSeparator + "'");
		}
		
		ParsePosition parsePosition = new ParsePosition(0);
		Number number = numberFormat.parse(value, parsePosition);

		if(parsePosition.getIndex() != value.length()){
			throw new NumberFormatException("Could not parse " + value + " to Number");
		}

		return number;
	}
	
	public Object parse(String value, DataType dtype){
		switch(dtype){
			case INT:
				try {
					return Integer.parseInt(value);
				} catch (NumberFormatException e) {
					throw new NumberFormatException("Could not parse " + value + " to INT");
				}
			case STRING: return value;
			case FLOAT:
				Float flt = parseDecimal(value).floatValue();
				
				if (flt.isInfinite())
					throw new NumberFormatException(value + " is outside the range for Float.");
				else
					return flt;
			case DOUBLE: 
				Double dbl = parseDecimal(value).doubleValue();
				
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
