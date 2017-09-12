import CartItem from './CartItem';

export default class Preview {
	constructor(lookup, item, options, type, visible){
		this._lookup = lookup;
		this._item = item;
		this._options = options;
		this._type = type;
		this._visible = visible === undefined ? false : visible;
	}

	withLookup(specTable){
		return new Preview(parseSpecTable(specTable));
	}

	getSpecLookup(spec){
		return this._lookup && this._lookup[spec]
			? this._lookup[spec]
			: undefined;
	}

	getSpecLookupType(spec){
		const specLookup = this.getSpecLookup(spec);
		return specLookup ? this.getSpecLookup(spec).type : undefined;
	}

	initPreview(cart, id, objectsTable) {
		if (cart.hasItem(id)) {
			const item = cart.item(id);
			const options = this._lookup[item.spec];
			return new Preview(this._lookup, item, options.options, options.type, true);

		} else if (this._item && this._item.id === id) {
			return this.show();

		} else {
			const objInfo = objectsTable.find(ot => ot.dobj === id);
			const item = objInfo ? new CartItem(objInfo) : undefined;
			const options = item ? this._lookup[item.spec] : undefined;

			if (options && options.type === 'TIMESERIES'){
				const xAxis = options.options.find(o => o === 'TIMESTAMP');

				if (item && xAxis){
					const url = item.getNewUrl({
						objId: item.id.split('/').pop(),
						x: xAxis,
						type: 'scatter'
					});
					console.log({id, objInfo, item, options, xAxis, url});
					return new Preview(this._lookup, item.withUrl(url), options.options, options.type, true);

				} else {
					return new Preview(this._lookup, item, options.options, options.type, true);
				}

			} else if (options && options.type === 'NETCDF'){
				console.log({id, objInfo, item, options});
				return new Preview(this._lookup, item, options.options, options.type, true);
			}
		}
	}

	// withItemSetting(setting, value, itemType){
	// 	return new Preview(this._lookup, this._item.withSetting(setting, value, itemType), this._options, this._type, this._visible);
	// }

	withItemUrl(url){
		return new Preview(this._lookup, this._item.withUrl(url), this._options, this._type, this._visible);
	}

	show(){
		return new Preview(this._lookup, this._item, this._options, this._type, true);
	}

	hide(){
		return new Preview(this._lookup, this._item, this._options, this._type, false);
	}

	get item(){
		return this._item;
	}

	get options(){
		return this._options;
	}

	get type(){
		return this._type;
	}

	get visible(){
		return this._visible;
	}

	get lookup(){
		return this._lookup;
	}
}

function parseSpecTable(specTable){
	const basicsRows = specTable.getTable("basics") ? specTable.getTableRows("basics") : undefined;
	const columnMetaRows = specTable.getTable("columnMeta") ? specTable.getTableRows("columnMeta") : undefined;

	const netcdf = basicsRows
		? basicsRows.reduce((acc, curr) => {
			if (curr.format === 'NetCDF'){
				acc[curr.spec] = {
					type: 'NETCDF'
				}
			}

			return acc;
		}, {})
		: [];

	const timeSeries = columnMetaRows
		? columnMetaRows.reduce((acc, curr) => {
			acc[curr.spec] === undefined
				? acc[curr.spec] = {
					type: 'TIMESERIES',
					options: [curr.colTitle]
				}
				: acc[curr.spec].options.push(curr.colTitle);

			return acc;

		}, {})
		: [];

	return Object.assign({}, netcdf, timeSeries);
}