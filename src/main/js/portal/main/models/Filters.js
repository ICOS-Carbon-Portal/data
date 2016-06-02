
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

export class PropertyListFilter{
	constructor(prop, list){
		this._prop = prop;
		this._value = list;
	}

	get list(){
		return this._value;
	}

	getValueList(){
		const stationList = this._value.map(station => station.name + "^^xsd:string").join(" ");
		
		return `VALUES ?stationName {\n${stationList}\n}\n`;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "?stationName .\n`;
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

