import config from '../config';

export class EmptyFilter {
	getSparql(){
		return "";
	}

	isEmpty(){
		return true;
	}
}

export class PropertyValueFilter {
	constructor(prop, value){
		this._prop = prop;
		this._value = value;
	}

	isEmpty(){
		return !this._value || this._value.length == 0;
	}

	get value(){
		return this._value;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "${stringValue}"^^xsd:string .\n`;
	}
}

export class TemporalFilter {
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
			? `?${varName} prov:startedAtTime ?startTime .
				FILTER(?startTime >= "${this._value}"^^xsd:dateTime)\n`
			: `?${varName} prov:endedAtTime ?endTime .
				FILTER(?endTime <= "${this._value}"^^xsd:dateTime)\n`;
	}
}

export class StationMultiFilter {
	constructor(stationUris){
		this._stationUris = stationUris;
	}

	isEmpty(){
		return !this._stationUris || this._stationUris.length === 0;
	}

	getSparql(varName){
		if(this.isEmpty()) return "";
		const uriList = this._stationUris.join("> <");
		return `VALUES ?${varName} {<${uriList}>}`;
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

