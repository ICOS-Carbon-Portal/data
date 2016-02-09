package se.lu.nateko.cp.data.formats.bintable;

public class Schema {

	public final DataType[] columns;
	public final long size;

	public Schema(DataType[] columns, long size){
		this.columns = columns;
		this.size = size;
	}
	
	public boolean hasStringColumn(){
		for(DataType column: columns){
			if(column == DataType.STRING) return true;
		}
		return false;
	}
}
