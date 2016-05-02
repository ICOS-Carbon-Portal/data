
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

function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

