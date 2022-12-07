package se.lu.nateko.cp.data.formats.bintable;

import java.io.Closeable;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.RandomAccessFile;

public abstract class BinTableFile implements Closeable{

	protected final RandomAccessFile file;
	protected final String fileName;
	protected final Schema schema;
	protected final long[] columnSizes;
	protected final long[] columnOffsets;
	protected final int[] columnValueSizes;

	protected BinTableFile(File file, Schema schema, String accessType) throws FileNotFoundException{
		this.file = new RandomAccessFile(file, accessType);
		this.fileName = file.getName();
		this.schema = schema;
		columnSizes = Utils.getColumnSizes(schema);
		columnOffsets = Utils.getColumnByteOffsets(columnSizes);
		columnValueSizes = Utils.getColumnValueSizes(schema);
	}
	
}
