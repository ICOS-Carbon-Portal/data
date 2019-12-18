import CartItem from './CartItem';
import {getNewTimeseriesUrl} from '../utils';
import config from "../config";
import commonConfig from '../../../common/main/config';
import deepEqual from 'deep-equal';
import Lookup from "./Lookup";
import Cart from "./Cart";
import {ExtendedDobjInfo, ObjectsTable} from "./State";
import {KeyAnyVal, Sha256Str, UrlStr} from "../backend/declarations";


export type PreviewItem = CartItem & Partial<ExtendedDobjInfo[0]>
export type PreviewOption = {
	colTitle: string
	valTypeLabel: string
}

type PreviewTypes = keyof typeof commonConfig.previewTypes
type PreviewType = PreviewTypes | 'unknown'

export default class Preview {
	public readonly items: PreviewItem[];
	public pids: Sha256Str[];
	public readonly options: PreviewOption[];
	public readonly type: PreviewType;
	public readonly visible: boolean;


	constructor(items?: PreviewItem[], options?: PreviewOption[], type?: PreviewType, visible?: boolean){
		this.items = items ?? [];
		this.pids = this.items.map(item => item._id.split('/').pop()!) ?? [];
		this.options = options ?? [];
		this.type = type ?? 'unknown';
		this.visible = visible ?? false;
	}

	get serialize(){
		return {
			items: this.items.map(item => item.serialize),
			options: this.options,
			type: this.type,
			visible: this.visible
		};
	}

	static deserialize(jsonPreview: Preview) {
		const items: PreviewItem[] = jsonPreview.items.map(item => new CartItem(item._dataobject, item.type, item.url));
		const options = jsonPreview.options;
		const type = jsonPreview.type;
		const visible = jsonPreview.visible;

		return new Preview(items, options, type, visible);
	}

	initPreview(lookup: Lookup['table'] & KeyAnyVal, cart: Cart, ids: string[], objectsTable: ObjectsTable[]) {
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

		const items: CartItem[] = objects.filter(o => o.item).map(o => o.item!);

		if (options.type === config.TIMESERIES){
			const xAxis = ['TIME', 'Date', 'UTC_TIMESTAMP', 'TIMESTAMP'].find(x => options.options.some((op: any) => op.colTitle === x));
			if (items && xAxis){
				const url = getNewTimeseriesUrl(items, xAxis);
				return new Preview(items.map(i => i.withUrl(url)), options.options, options.type, true);
			}
		} else if (options.type === config.NETCDF || options.type === config.MAPGRAPH){
			return new Preview(items, options.options, options.type, true);
		}

		throw new Error('Could not initialize Preview');
	}

	restore(lookup: Lookup['table'], cart: Cart, objectsTable: ObjectsTable[]) {
		if (this.visible){
			return this;
		} else if (this.pids.length > 0) {
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
		return new Preview(this.items.map(i => i.withUrl(url)), this.options, this.type, this.visible);
	}

	show(){
		return new Preview(this.items, this.options, this.type, true);
	}

	hide(){
		return new Preview(this.items, this.options, this.type, false);
	}

	get hasPids(){
		return this.pids.length > 0;
	}

	get item() {
		return this.items[0];
	}
}
