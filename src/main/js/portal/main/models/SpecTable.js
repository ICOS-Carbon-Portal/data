export default class SpecTable{
	constructor(colNames, data, filters){
		this._colNames = colNames;
		this._filters = filters || colNames.map(() => []);
		this._data = data;

		this._keyCol = 'spec';
	}

	get names(){
		return this._colNames.filter(h => h !== this._keyCol);
	}

	withFilter(colName, values){
		const idx = this.getIdx(colName);
		const newFilters = this._filters.slice(0, idx)
			.concat(values)
			.concat(this._filters.slice(idx));

		return new SpecTable(this._colNames, newFilters, this._data);
	}

	getIdx(colName){
		return this._colNames.indexOf(colName);
	}

	getDistinctColValues(colName){
		const idx = this._colNames.indexOf(colName);

		return idx < 0
			? undefined
			: this._data.reduce((acc, curr) => {
				if (curr[idx] && acc.indexOf(curr[idx]) < 0) {
					acc.push(curr[idx]);
				}
				return acc;
			}, [])
	}

	getDistinctColObjects(colName){
		const values = this.getDistinctColValues(colName);

		return values
			? values.map((v, idx) => {
				return {
					id: idx,
					text: v,
					isIntExcl: false,
					isExtExcl: false
				};
			})
			: undefined;
	}
}

export const parseSpecs = (specs) => {
	const bindings = specs.results.bindings;
	const colNames = specs.head.vars;

	return {
		colNames,
		bindings: bindings.map(b => {
			return colNames.map(h => {
				return b[h]
					? b[h].datatype === "http://www.w3.org/2001/XMLSchema#integer"
						? parseInt(b[h].value)
						: b[h].value
					: undefined;
			});
		})};
};
