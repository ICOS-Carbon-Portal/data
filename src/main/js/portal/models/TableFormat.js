'use strict';

function parseJson(tableId, json){
	return [{
		columnNames: json.results.bindings.map(function(binding){
			return binding.colName.value;
		}),
		columnUnits: json.results.bindings.map(function(binding){
			return binding.unit ? binding.unit.value : "?";
		}),
		request: {
			"tableId": tableId,
			"schema": {
				"columns": json.results.bindings.map(function(binding){
					return mapDataTypes(binding.valFormat.value);
				}),
				"size": parseInt(json.results.bindings[0].nrows.value)
			},
			"columnNumbers": json.results.bindings.map(function(binding, i){
				return i;
			})
		}
	}];
}

function mapDataTypes(rdfsUnit){
	const dType = rdfsUnit.split("/").pop();

	switch(dType){
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

export default class TableFormat{
	constructor(tableId, sparqlResult){
		this._table = parseJson(tableId, sparqlResult);
	}

	get table(){
		return this._table;
	}
}