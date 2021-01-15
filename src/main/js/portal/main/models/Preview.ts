import CartItem, {CartItemSerialized} from './CartItem';
import {getNewTimeseriesUrl, getLastSegmentInUrl, isDefined} from '../utils';
import config, {PreviewType} from "../config";
import deepEqual from 'deep-equal';
import PreviewLookup, {PreviewInfo} from "./PreviewLookup";
import Cart from "./Cart";
import {ExtendedDobjInfo, ObjectsTable} from "./State";
import {Sha256Str, UrlStr} from "../backend/declarations";


export type PreviewItem = CartItem & Partial<ExtendedDobjInfo>
export type PreviewItemSerialized = CartItemSerialized & Partial<ExtendedDobjInfo>

export interface PreviewOption {
	varTitle: string
	valTypeLabel: string
}

export interface PreviewSerialized {
	items: PreviewItemSerialized[]
	options: PreviewOption[],
	type: PreviewType | undefined
}

export default class Preview {
	public readonly items: PreviewItem[];
	public pids: Sha256Str[];
	public readonly options: PreviewOption[];
	public readonly type: PreviewType | undefined;


	constructor(items?: PreviewItem[], options?: PreviewOption[], type?: PreviewType){
		this.items = items ?? [];
		this.pids = this.items.map(item => getLastSegmentInUrl(item.dobj));
		this.options = options ?? [];
		this.type = type;
	}

	get serialize(): PreviewSerialized {
		return {
			items: this.items.map(item => item.serialize),
			options: this.options,
			type: this.type
		};
	}

	static deserialize(jsonPreview: PreviewSerialized) {
		const items: PreviewItem[] = jsonPreview.items.map(item => new CartItem(item.dataobject, item.type, item.url));
		const options = jsonPreview.options;
		const type = jsonPreview.type;

		return new Preview(items, options, type);
	}

	initPreview(lookup: PreviewLookup, cart: Cart, ids: UrlStr[], objectsTable: ObjectsTable[]) {
		const objects = ids.map(id => {
			const objInfo = objectsTable.find(ot => ot.dobj.endsWith(id));

			type OptionWithType = {
				options: PreviewOption[]
				type: PreviewType | undefined
			}

			const previewInfo: PreviewInfo | undefined = objInfo
				? lookup.forDataObjSpec(objInfo.spec)
				: cart.hasItem(id)
					? lookup.forDataObjSpec(cart.item(id)!.spec)
					: undefined;

			const options: OptionWithType = previewInfo == undefined
				? {type: undefined, options: []}
				: previewInfo.type === "TIMESERIES"
					? previewInfo
					: {type: previewInfo.type, options: []};

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

		const items: CartItem[] = objects.map(o => o.item).filter(isDefined);

		if (options.type === config.TIMESERIES){
			if (items.length){
				let previewItems = items;
				const xAxis = config.previewXaxisCols.find(x => options.options.some(op => op.varTitle === x));
				if(xAxis){
					const url = getNewTimeseriesUrl(items, xAxis);
					previewItems = items.map(i => i.withUrl(url));
				}
				return new Preview(previewItems, options.options, options.type);
			}
			else throw new Error("No items to preview");
		} else if (options.type === config.NETCDF || options.type === config.MAPGRAPH){
			return new Preview(items, options.options, options.type);
		}

		throw new Error('Could not initialize Preview');
	}

	restore(lookup: PreviewLookup, cart: Cart, objectsTable: ObjectsTable[]) {
		if (this.hasPids) {
			return this.initPreview(lookup, cart, this.pids.map(pid => config.objectUriPrefix[config.envri] + pid), objectsTable);
		} else {
			return this;
		}
	}


	withPids(pids: Sha256Str[]){
		this.pids = pids;
		return this;
	}

	withItemUrl(url: UrlStr){
		return new Preview(this.items.map(i => i.withUrl(url)), this.options, this.type);
	}

	get hasPids(){
		return this.pids.length > 0;
	}

	get item() {
		return this.items[0];
	}

	get hasAllItems(){
		const itemPids = this.items.map(item => getLastSegmentInUrl(item.dobj));//

		return this.hasPids && this.pids.every(pid => itemPids.includes(pid));
	}
}
