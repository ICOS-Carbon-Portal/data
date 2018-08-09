import CartItem from './CartItem';
import {getNewTimeseriesUrl} from '../utils.js';
import config from '../config';
import deepEqual from 'deep-equal';

export default class Preview {
	constructor(items, options, type, visible){
		this._items = items || [];
		this._options = options;
		this._type = type;
		this._visible = visible === undefined ? false : visible;
	}

	initPreview(lookup, cart, ids, objectsTable) {

		const objects = ids.map(id => {
			const objInfo = objectsTable.find(ot => ot.dobj.endsWith(id));
			const options = objInfo
				? lookup[objInfo.spec]
				: cart.hasItem(id) ? lookup[cart.item(id).spec] : {};
			const item = cart.hasItem(id)
				? cart.item(id)
				: objInfo ? new CartItem(objInfo, options.type) : undefined;
			return {options, item};
		});

		const options = objects[0].options;

		objects.map(object => {
			if(!deepEqual(options, object.options)) {
				throw new Error('Cannot preview differently structure objects');
			}
		});

		const items = objects.map(o => o.item);

		if (options.type === config.TIMESERIES){
			const xAxis = ['Date', 'UTC_TIMESTAMP', 'TIMESTAMP'].find(x => options.options.includes(x));

			if (items && xAxis){
				const url = getNewTimeseriesUrl(items, xAxis);
				return new Preview(items.map(i => i.withUrl(url)), options.options, options.type, true);
			}
		} else if (options.type === config.NETCDF){
			return new Preview(items, options.options, options.type, true);
		}

		throw new Error('Could not initialize Preview');
	}

	withItemUrl(url){
		return new Preview(this._items.map(i => i.withUrl(url)), this._options, this._type, this._visible);
	}

	show(){
		return new Preview(this._items, this._options, this._type, true);
	}

	hide(){
		return new Preview(this._items, this._options, this._type, false);
	}

	get item() {
		return this._items[0];
	}

	get items(){
		return this._items;
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
