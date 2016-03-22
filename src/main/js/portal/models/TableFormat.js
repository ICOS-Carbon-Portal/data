'use strict';

export function parseTableFormat(tableId, sparqlResult){
	const bindings = sparqlResult.results.bindings;

	return [{
		columnNames: bindings.map(function(binding){
			return binding.colName.value;
		}),
		columnUnits: bindings.map(function(binding){
			return binding.unit ? binding.unit.value : "?";
		}),
		request: {
			"tableId": tableId,
			"schema": {
				"columns": bindings.map(function(binding){
					return mapDataTypes(binding.valFormat.value);
				}),
				"size": parseInt(bindings[0].nrows.value)
			},
			"columnNumbers": bindings.map(function(binding, i){
				return i;
			})
		}
	}];
}

function lastUrlPart(url){
	return rdfDataType.split("/").pop();
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

export class TableFormat{
	constructor(columnsInfo){
		this._columnsInfo = columnsInfo;
	}

	getRequest(id, nRows, columnIndices){
		const cols = this._columnsInfo.map(colInfo => colInfo.type)
		return {
			tableId: lastUrlPart(id),
			schema: {
				columns: cols,
				size: nRows
			},
			columnNumbers: columnIndices || Array.from(cols, (_, i) => i)
		};
	}
}


