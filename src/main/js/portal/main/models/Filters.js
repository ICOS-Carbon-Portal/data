import config from '../config';

export class EmptyFilter{
	getSparql(){
		return "";
	}

	isEmpty(){
		return true;
	}
}

export class PropertyValueFilter{
	constructor(prop, value){
		this._prop = prop;
		this._value = value;
	}

	get value(){
		return this._value;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "${stringValue}"^^xsd:string .\n`;
	}
}

export class SpatialFilter{
	constructor(prop, list){
		this._prop = prop;
		this._values = list;
	}

	isEmpty(){
		return false;
	}

	get list(){
		return this._values;
	}

	getValueList(){
		const stationList = this._values.map(station => station.name + "^^xsd:string").join(" ");
		
		return `VALUES ?stationName {\n${stationList}\n}\n`;
	}

	getSparql(){
		const namesEnumeration = this._values
			.map(station => '"' + sparqlEscape(station.name) + '"^^xsd:string')
			.join(" ");

		return this._values.length > 0
			? `?dobj <${config.wdcggStationProp}> ?stationName .
			VALUES ?stationName {
				${namesEnumeration}
			}`
			: "";
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

