import CartItem from './CartItem';
import {getNewTimeseriesUrl} from '../utils.js';
import config from '../config';

export default class Preview {
	constructor(item, options, type, visible){
		this._item = item;
		this._options = options;
		this._type = type;
		this._visible = visible === undefined ? false : visible;
	}

	initPreview(lookup, cart, id, objectsTable) {
		if (this._item && this._item.id === id) {
			return this.show();
		}

		const objInfo = objectsTable.find(ot => ot.dobj === id);
		const options = objInfo ? lookup[objInfo.spec] : {};
		const item = cart.hasItem(id)
			? cart.item(id)
			: objInfo ? new CartItem(objInfo, options.type) : undefined;

		if (options.type === config.TIMESERIES){
			const xAxis = options.options.find(o => o === 'TIMESTAMP');

			if (item && xAxis){
				const url = getNewTimeseriesUrl(item, xAxis);
				return new Preview(item.withUrl(url), options.options, options.type, true);
			}
		} else if (options.type === config.NETCDF){
			return new Preview(item, options.options, options.type, true);
		} else if (cart.hasItem(id)){
			return new Preview(item, undefined, item.type, true);
		}

		throw new Error('Could not initialize Preview');
	}

	withItemUrl(url){
		return new Preview(this._item.withUrl(url), this._options, this._type, this._visible);
	}

	show(){
		return new Preview(this._item, this._options, this._type, true);
	}

	hide(){
		return new Preview(this._item, this._options, this._type, false);
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
}
