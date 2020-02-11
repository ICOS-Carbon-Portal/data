import CartItem, {CartItemSerialized} from './CartItem';
import {getNewTimeseriesUrl, getLastSegmentInUrl, isDefined} from '../utils';
import config from "../config";
import commonConfig from '../../../common/main/config';
import deepEqual from 'deep-equal';
import Lookup from "./Lookup";
import Cart from "./Cart";
import {ExtendedDobjInfo, ObjectsTable} from "./State";
import {KeyAnyVal, Sha256Str, UrlStr} from "../backend/declarations";


export type PreviewItem = CartItem & Partial<ExtendedDobjInfo>
export type PreviewItemSerialized = CartItemSerialized & Partial<ExtendedDobjInfo>
export type PreviewOption = {
	colTitle: string
	valTypeLabel: string
}

type PreviewTypes = keyof typeof commonConfig.previewTypes
type PreviewType = PreviewTypes | 'unknown'
export interface PreviewSerialized {
	items: PreviewItemSerialized[]
	options: PreviewOption[],
	type: PreviewType
}

export default class Preview {
	public readonly items: PreviewItem[];
	public pids: Sha256Str[];
	public readonly options: PreviewOption[];
	public readonly type: PreviewType;


	constructor(items?: PreviewItem[], options?: PreviewOption[], type?: PreviewType){
		this.items = items ?? [];
		this.pids = this.items.map(item => item._id.split('/').pop()!) ?? [];
		this.options = options ?? [];
		this.type = type ?? 'unknown';
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

	initPreview(lookup: Lookup['table'] & KeyAnyVal, cart: Cart, ids: UrlStr[], objectsTable: ObjectsTable[]) {
		const objects = ids.map(id => {
			const objInfo = objectsTable.find(ot => ot.dobj.endsWith(id));
			type OptionWithType = {
				options: PreviewOption[]
				type: PreviewTypes
			}
			const options: OptionWithType = objInfo
				? lookup[objInfo.spec]
				: cart.hasItem(id) ? lookup[cart.item(id)!.spec] : {};
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
				const xAxis = config.previewXaxisCols.find(x => options.options.some(op => op.colTitle === x));
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

	restore(lookup: Lookup['table'], cart: Cart, objectsTable: ObjectsTable[]) {
		if (this.hasPids) {
			return this.initPreview(lookup, cart, this.pids.map(pid => config.previewIdPrefix[config.envri] + pid), objectsTable);
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
		const itemPids = this.items.map(item => getLastSegmentInUrl(item.id));//

		return this.hasPids && this.pids.every(pid => itemPids.includes(pid));
	}
}
