
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
		return `?${varName} <${this._prop}> "${this._value}"^^xsd:string .\n`;
	}
}

