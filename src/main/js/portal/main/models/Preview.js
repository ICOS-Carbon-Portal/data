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
			const xAxisSetting = options && options.type === 'TIMESERIES'
				? options.options.find(o => o === 'TIMESTAMP')
				: undefined;

			if (item && xAxisSetting){
				return new Preview(this._lookup, item.withSetting('xAxis', xAxisSetting), options.options, options.type, true);
			} else {
				return new Preview(this._lookup, item, options.options, options.type, true);
			}

		}
	}

	withItemSetting(setting, value){
		return new Preview(this._lookup, this._item.withSetting(setting, value), this._options, this._type, this._visible);
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
	return specTable.getTable("columnMeta") && specTable.getTableRows("columnMeta")
		? specTable.getTableRows("columnMeta").reduce((acc, curr) => {

			acc[curr.spec] === undefined
				? acc[curr.spec] = {
				type: 'TIMESERIES',
				options: [curr.colTitle]
			}
				: acc[curr.spec].options.push(curr.colTitle);

			return acc;

		}, {})
		: [];
}