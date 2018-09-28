import CartItem from './CartItem';
import {getNewTimeseriesUrl} from '../utils.js';
import config from '../config';
import deepEqual from 'deep-equal';


export default class Preview {
	constructor(items, options, type, visible){
		this._items = items || [];
		this._pids = this._items.map(item => item._id.split('/').pop());
		this._options = options;
		this._type = type;
		this._visible = visible === undefined ? false : visible;
	}

	get serialize(){
		return {
			items: this._items.map(item => item.serialize),
			options: this._options,
			type: this._type,
			visible: this._visible
		};
	}

	static deserialize(jsonPreview) {
		const items = jsonPreview.items.map(item => new CartItem(item.dataobject, item.type, item.url));
		const options = jsonPreview.options;
		const type = jsonPreview.type;
		const visible = jsonPreview.visible;

		return new Preview(items, options, type, visible);
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

	restore(lookup, cart, objectsTable) {
		if (this.visible){
			return this;
		} else if (this._pids.length > 0) {
			return this.initPreview(lookup, cart, this._pids.map(pid => config.previewIdPrefix + pid), objectsTable);
		} else {
			return this;
		}
	}


	withPids(pids){
		this._pids = pids;
		return this;
	}

	withItemUrl(url){
		return typeof url === 'string'
			? new Preview(this._items.map(i => i.withUrl(url)), this._options, this._type, this._visible)
			: this;
	}

	show(){
		return new Preview(this._items, this._options, this._type, true);
	}

	hide(){
		return new Preview(this._items, this._options, this._type, false);
	}

	get pids(){
		return this._pids;
	}

	get hasPids(){
		return this._pids.length > 0;
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
