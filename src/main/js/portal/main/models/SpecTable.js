export default class SpecTable{
	constructor(specs){
		this._headers = specs.head.vars;
		this._filters = this._headers.map(h => []);
		this._data = this.parseBindings(specs.results.bindings);
	}

	parseBindings(bindings){
		return bindings.map(b => {
			return this._headers.map(h => {
				return b[h]
					? b[h].datatype === "http://www.w3.org/2001/XMLSchema#integer"
						? parseInt(b[h].value)
						: b[h].value
					: undefined;
			});
		});
	}

	get headers(){
		return this._headers;
	}

	setFilter(colName, values){
		const idx = this._headers.indexOf(colName);

		if (idx >= 0) this._filters[idx] = values;
	}

	getIdx(colName){
		return this._headers.indexOf(colName);
	}
}