
export class EmptyFilter{
	constructor(render){
		this._render = render;
	}

	get render(){
		return this._render;
	}
	
	getSparql(){
		return "";
	}

	isEmpty(){
		return true;
	}
}

export class PropertyValueFilter{
	constructor(prop, value, render = true){
		this._prop = prop;
		this._value = value;
		this._render = render;
	}

	get value(){
		return this._value;
	}

	get render(){
		return this._render;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "${stringValue}"^^xsd:string .\n`;
	}
}

export class SpatialFilter{
	constructor(prop, list, render = false){
		this._prop = prop;
		this._values = list;
		this._render = render;
	}

	get list(){
		return this._values;
	}

	get render(){
		return this._render;
	}

	getValueList(){
		const stationList = this._values.map(station => station.name + "^^xsd:string").join(" ");
		
		return `VALUES ?stationName {\n${stationList}\n}\n`;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._values);
		return `?${varName} <${this._prop}> "?stationName .\n`;
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

