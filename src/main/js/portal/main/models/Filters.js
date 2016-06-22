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

	isEmpty(){
		return this._value.length == 0;
	}

	get value(){
		return this._value;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "${stringValue}"^^xsd:string .\n`;
	}
}

export class TemporalFilter{
	constructor(prop, value){
		this._prop = prop;
		this._value = value;
	}

	isEmpty(){
		return this._value.length == 0;
	}

	get value(){
		return this._value;
	}

	getSparql(varName){
		return this._prop == config.fromDateProp
			? `?${varName} cpmeta:wasProducedBy/prov:startedAtTime ?startTime .
				FILTER(?startTime >= "${this._value}"^^xsd:dateTime)\n`
			: `?${varName} cpmeta:wasProducedBy/prov:endedAtTime ?endTime .
				FILTER(?endTime <= "${this._value}"^^xsd:dateTime)\n`;
	}
}

export class SpatialFilter{
	constructor(prop, list){
		this._prop = prop;
		this._values = list;
	}

	isEmpty(){
		return this._values.length == 0;
	}

	get list(){
		return this._values;
	}

	getSparql(varName){
		const namesEnumeration = this._values
			.map(station => '"' + sparqlEscape(station.name) + '"^^xsd:string')
			.join(" ");

		return this._values.length > 0
			? `?${varName} <${config.wdcggStationProp}> ?stationName .
			VALUES ?stationName {
				${namesEnumeration}
			}`
			: "";
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

