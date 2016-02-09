package se.lu.nateko.cp.data.formats.bintable;

public class Utils {

	public static long[] getColumnSizes(Schema schema){
		long[] res = new long[schema.columns.length];
		for(int i = 0; i < res.length; i++){
			res[i] = schema.size * getDataTypeSize(schema.columns[i]);
		}
		return res;
	}

	public static long[] getColumnByteOffsets(long[] columnSizes){
		long[] res = new long[columnSizes.length + 1];
		res[0] = 0;
		for(int i = 1; i < res.length; i++){
			res[i] = res[i - 1] + columnSizes[i - 1];
		}
		return res;
	}

	public static int[] getColumnValueSizes(Schema schema){
		int[] res = new int[schema.columns.length];
		for(int i = 0; i < res.length; i++){
			res[i] = getDataTypeSize(schema.columns[i]);
		}
		return res;
	}

	public static int getDataTypeSize(DataType dt){
		switch(dt){
			case INT: return 4;
			case LONG: return 8;
			case FLOAT: return 4;
			case DOUBLE: return 8;
			case SHORT: return 2;
			case CHAR: return 1;
			case BYTE: return 1;
			case STRING: return 4;
			default: throw unsupportedDatatypeException(dt);
		}
	}
	
	public static RuntimeException unsupportedDatatypeException(DataType dt){
		return new RuntimeException("Unsupported " + DataType.class.getCanonicalName() + " " + dt);
	}

}
