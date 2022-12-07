package se.lu.nateko.cp.data.formats.bintable;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel.MapMode;

public class BinTableReader extends BinTableFile {

	private final String[] stringDictionary;
	private final ObjectInputStream ois;
	private final Long fileSizeInBytes;

	public BinTableReader(File file, Schema schema) throws IOException {
		super(file, schema, "r");

		fileSizeInBytes = file.length();

		if(schema.hasStringColumn()){
			this.file.seek(columnOffsets[schema.columns.length]);

			InputStream is = new BufferedInputStream(Channels.newInputStream(this.file.getChannel()));
			ois = new ObjectInputStream(is);

			int nStrings = ois.readInt();
			stringDictionary = new String[nStrings];

			for(int i = 0; i < nStrings; i++){
				stringDictionary[i] = ois.readUTF();
			}

		} else{
			stringDictionary = new String[0];
			ois = null;
		}
	}

	public Buffer read(int column) throws IOException{
		ensureSizeIsInteger();
		return read(column, 0, (int)schema.size);
	}

	public ByteBuffer readBytes(int column) throws IOException{
		ensureSizeIsInteger();
		return readBytes(column, 0, (int)schema.size);
	}

	private void ensureSizeIsInteger() throws IOException{
		if(schema.size > Integer.MAX_VALUE)
			throw new IOException("The table is too large, cannot read whole column into a buffer");
	}

	public ByteBuffer readBytes(int column, long offset, int size) throws IOException{
		DataType dt = schema.columns[column];

		int valueSize = Utils.getDataTypeSize(dt);
		long byteOffset = columnOffsets[column] + offset * valueSize;
		int byteSize = valueSize * size;
		if(byteOffset + byteSize > fileSizeInBytes) throw new IOException(
			"Out of bounds when reading CP binary table file " + fileName
		);

		if(byteSize < 10000){
			file.seek(byteOffset);
			byte[] barray = new byte[byteSize];
			file.read(barray);
			return ByteBuffer.wrap(barray);
		}else
			return file.getChannel().map(MapMode.READ_ONLY, byteOffset, byteSize);
	}

	public Buffer read(int column, long offset, int size) throws IOException{
		ByteBuffer bytes = readBytes(column, offset, size);

		DataType dt = schema.columns[column];

		switch(dt){
			case INT: return bytes.asIntBuffer();
			case FLOAT: return bytes.asFloatBuffer();
			case DOUBLE: return bytes.asDoubleBuffer();
			case SHORT: return bytes.asShortBuffer();
			case CHAR: return bytes.asCharBuffer();
			case BYTE: return bytes;
			case STRING: return bytes.asIntBuffer();
			default: throw Utils.unsupportedDatatypeException(dt);
		}
	}

	public String getStringForIndex(int index){
		return stringDictionary[index];
	}

	@Override
	public void close() throws IOException {
		if(ois != null) ois.close();
		file.close();
	}
}
