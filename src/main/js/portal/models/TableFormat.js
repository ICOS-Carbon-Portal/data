
export function parseTableFormat(sparqlResult){
	const columnsInfo = sparqlResult.results.bindings.map(binding => {
		return {
			name: binding.colName.value,
			label: binding.valueType.value,
			unit: binding.unit ? binding.unit.value : "?",
			type: mapDataTypes(binding.valFormat.value)
		};
	});
	return new TableFormat(columnsInfo);
}

export function lastUrlPart(url){
	return url.split("/").pop();
}

function mapDataTypes(rdfDataType){
	switch(lastUrlPart(rdfDataType)){
		case "float32":
			return "FLOAT";

		case "iso8601date":
			return "INT";

		case "iso8601timeOfDay":
			return "INT";

		case "iso8601dateTime":
			return "DOUBLE";

		default:
			return dType;
	}
}

class TableRequest{
	constructor(tableId, schema, columnNumbers){
		this.tableId = tableId;
		this.schema = schema;
		this.columnNumbers = columnNumbers;
	}

	get returnedTableSchema(){
		return {
			columns: this.columnNumbers.map(i => this.schema.columns[i]),
			size: this.schema.size
		};
	}
}

export class TableFormat{

	constructor(columnsInfo){
		this._columnsInfo = columnsInfo;
	}

	getColumnIndex(colName){
		return this._columnsInfo.findIndex(colInfo => colName == colInfo.name);
	}

	columns(i){
		return this._columnsInfo[i];
	}

	getRequest(id, nRows, columnIndices){
		const cols = this._columnsInfo.map(colInfo => colInfo.type)

		return new TableRequest(
			lastUrlPart(id),
			{
				columns: cols,
				size: nRows
			},
			columnIndices || Array.from(cols, (_, i) => i)
		);
	}
}

