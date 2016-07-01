import config from '../config';

export class Filter{}

export class EmptyFilter extends Filter{
	getSparql(){
		return "";
	}

	isEmpty(){
		return true;
	}
}

export class PropertyValueFilter extends Filter{
	constructor(prop, value){
		super();
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

export class TemporalFilter extends Filter{
	constructor(prop, value){
		super();
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
			? `?${varName} cpmeta:wasAcquiredBy/prov:startedAtTime ?startTime .
				FILTER(?startTime >= "${this._value}"^^xsd:dateTime)\n`
			: `?${varName} cpmeta:wasAcquiredBy/prov:endedAtTime ?endTime .
				FILTER(?endTime <= "${this._value}"^^xsd:dateTime)\n`;
	}
}

export class StationFilter extends Filter{}

export class StationPropertyValueFilter extends StationFilter{
	constructor(prop, value){
		super();
		this._prop = prop;
		this._value = value;
	}

	isEmpty(){
		return !this._value || this._value.length == 0;
	}

	getSparql(varName){
		const stringValue = sparqlEscape(this._value);
		return `?${varName} <${this._prop}> "${stringValue}"^^xsd:string .\n`;
	}
}

export class SpatialFilter extends StationFilter{
	constructor(bbox, includeMobile){
		super();
		this._bbox = bbox;
		this._includeMobile = includeMobile;
	}

	isEmpty(){
		return !this._bbox;
	}

	getSparql(varName){
		if(isEmpty()) return "";

		const latLonQuery = `?${varName} cpmeta:hasLatitude ?lat . ?${varName} cpmeta:hasLongitude ?lon .`;

		const bbox = this._bbox;
		const fixedStationsQuery = `${latLonQuery}
			FILTER (?lat >= ${bbox.minLat} && ?lat <= ${bbox.maxLat} && ?lon >= ${bbox.minLon} && ?lon <= ${bbox.maxLon})`;

		return this._includeMobile
			? `{{
					${fixedStationsQuery}
				} UNION {
				?${varName} a cpmeta:Station .
				FILTER NOT EXISTS { ${latLonQuery} }
			}}`
			: fixedStationsQuery;
	}
}

export function sparqlEscape(s){
	return s.replace(/\"/g, '\\\"');
}

