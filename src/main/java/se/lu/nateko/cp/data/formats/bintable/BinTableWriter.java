package se.lu.nateko.cp.data.formats.bintable;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.nio.Buffer;
import java.nio.IntBuffer;
import java.nio.LongBuffer;
import java.nio.FloatBuffer;
import java.nio.DoubleBuffer;
import java.nio.ShortBuffer;
import java.nio.CharBuffer;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel.MapMode;
import java.util.LinkedHashMap;

public class BinTableWriter extends BinTableFile{

	private final MappedByteBuffer[] buffers;
	private final Buffer[] typedBuffers;
	private final LinkedHashMap<String, Integer> stringDictionary = new LinkedHashMap<String, Integer>();
	private int stringCount = 0;

	public BinTableWriter(File file, Schema schema) throws IOException {
		super(file, schema, "rw");

		int nCols = this.columnSizes.length;

		this.file.setLength(columnOffsets[nCols]); //offset AFTER the last column

		buffers = new MappedByteBuffer[nCols];
		typedBuffers = new Buffer[nCols];

		for(int i = 0; i < nCols; i++){

			buffers[i] = this.file.getChannel().map(MapMode.READ_WRITE, columnOffsets[i], columnSizes[i]);

			DataType dt = schema.columns[i];

			switch(dt){
				case INT:
					typedBuffers[i] = buffers[i].asIntBuffer(); break;
				case LONG:
					typedBuffers[i] = buffers[i].asLongBuffer(); break;
				case FLOAT:
					typedBuffers[i] = buffers[i].asFloatBuffer(); break;
				case DOUBLE:
					typedBuffers[i] = buffers[i].asDoubleBuffer(); break;
				case SHORT:
					typedBuffers[i] = buffers[i].asShortBuffer(); break;
				case CHAR:
					typedBuffers[i] = buffers[i].asCharBuffer(); break;
				case BYTE:
					typedBuffers[i] = buffers[i]; break;
				case STRING:
					typedBuffers[i] = buffers[i].asIntBuffer(); break;

				default: throw Utils.unsupportedDatatypeException(dt);
			}

		}
	}

	public void writeRow(Object[] row) throws IOException {

		for(int i = 0; i < schema.columns.length; i++){

			DataType dt = schema.columns[i];

			switch(dt){
				case INT:
					((IntBuffer)typedBuffers[i]).put((Integer)row[i]); break;
				case LONG:
					((LongBuffer)typedBuffers[i]).put((Long)row[i]); break;
				case FLOAT:
					((FloatBuffer)typedBuffers[i]).put((Float)row[i]); break;
				case DOUBLE:
					((DoubleBuffer)typedBuffers[i]).put((Double)row[i]); break;
				case SHORT:
					((ShortBuffer)typedBuffers[i]).put((Short)row[i]); break;
				case CHAR:
					((CharBuffer)typedBuffers[i]).put((Character)row[i]); break;
				case BYTE:
					((ByteBuffer)typedBuffers[i]).put((Byte)row[i]); break;
				case STRING:
					String s = (String)row[i];
					int stringIndex;
					if(stringDictionary.containsKey(s))
						stringIndex = stringDictionary.get(s);
					else {
						stringIndex = stringCount;
						stringDictionary.put(s, stringCount);
						stringCount++;
					}
					((IntBuffer)typedBuffers[i]).put(stringIndex); break;

				default: throw Utils.unsupportedDatatypeException(dt);
			}
		}

	}

	@Override
	public void close() throws IOException {
		file.seek(file.length());

		OutputStream os = new BufferedOutputStream(Channels.newOutputStream(file.getChannel()));
		ObjectOutputStream oos = new ObjectOutputStream(os);
		oos.writeInt(stringCount);
		for(String s: stringDictionary.keySet()){
			oos.writeUTF(s);
		}

		for(MappedByteBuffer buffer: buffers){
			buffer.force();
		}
		oos.close();
		file.close();
	}
	
}

