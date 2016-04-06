
export class EmptyFilter{
	get sparql(){
		return "";
	}
}

export class MaxDateFilter{
	constructor(date){
		this._maxDate = date;
	}

	get sparql(){
		return `?dobj cpmeta:wasProducedBy/prov:startedAtTime ?startTime . FILTER(?startTime <= "${this._maxDate}"^^xsd:dateTime)`;
	}
}

export class MinDateFilter{
	constructor(date){
		this._minDate = date;
	}

	get sparql(){
		return `?dobj cpmeta:wasProducedBy/prov:endedAtTime ?endTime . FILTER(?endTime >= "${this._minDate}"^^xsd:dateTime)`;
	}
}

export class PropertyValueFilter{
	constructor(prop, value){
		this._prop = prop;
		this._value = value;
	}

	get sparql(){
		return `?dobj <${prop}> "${value}"^^xsd:string .`;
	}
}


