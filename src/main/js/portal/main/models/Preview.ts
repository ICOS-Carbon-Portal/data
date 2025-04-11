import CartItem, {CartItemSerialized} from './CartItem';
import {getNewTimeseriesUrl, getLastSegmentInUrl, isDefined} from '../utils';
import config, {PreviewType} from "../config";
import deepEqual from 'deep-equal';
import PreviewLookup, {PreviewInfo} from "./PreviewLookup";
import Cart from "./Cart";
import {ExtendedDobjInfo, DataObject} from "./State";
import {Sha256Str, UrlStr} from "../backend/declarations";
import { Value } from './SpecTable';


export interface PreviewOption {
	varTitle: string
	valTypeLabel: string
}

export function previewVarCompare(po1: PreviewOption, po2: PreviewOption): number{
	return po1.varTitle.localeCompare(po2.varTitle)
}

export interface PreviewSerialized {
	items: CartItemSerialized[]
	options: PreviewOption[]
	type: PreviewType | undefined
	yAxis: string | undefined
	y2Axis: string | undefined
}

export default class Preview {
	public readonly items: CartItem[];
	public pids: Sha256Str[];
	public readonly options: PreviewOption[];
	public readonly type: PreviewType | undefined;
	public yAxis: string | undefined;
	public y2Axis: string | undefined;


	constructor(items?: CartItem[], options?: PreviewOption[], type?: PreviewType, yAxis?: string, y2Axis?: string){
		this.items = items ?? [];
		this.pids = this.items.map(item => getLastSegmentInUrl(item.dobj));
		this.options = options ?? [];
		this.type = type;
		this.yAxis = yAxis;
		this.y2Axis = y2Axis;
	}

	get serialize(): PreviewSerialized {
		return {
			items: this.items.map(item => item.serialize),
			options: this.options,
			type: this.type,
			yAxis: this.yAxis,
			y2Axis: this.y2Axis
		};
	}

	static deserialize(jsonPreview: PreviewSerialized) {
		const items: CartItem[] = jsonPreview.items.map(item => new CartItem(item.id, item.dataobject, item.type, item.url));
		const options = jsonPreview.options;
		const type = jsonPreview.type;
		const yAxis = jsonPreview.yAxis;
		const y2Axis = jsonPreview.y2Axis;

		return new Preview(items, options, type, yAxis, y2Axis);
	}

	initPreview(lookup: PreviewLookup, cart: Cart, ids: UrlStr[], objectsTable: DataObject[], yAxis?: string, y2Axis?: string) {
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
				: objInfo ? new CartItem(id, objInfo, options.type) : undefined;
			return {options, item};
		});

		const options = objects[0].options;
		objects.map(object => {
			if(!deepEqual(options, object.options)) {
				throw new Error('Cannot preview differently structured objects');
			}
		});

		const items: CartItem[] = objects.flatMap(o => o.item ?? [])

		if (items.length){
			if (options.type === 'TIMESERIES'){
					let previewItems = items;
					const xAxis = config.previewXaxisCols.find(x => options.options.some(op => op.varTitle === x));
					if(xAxis){
						const url = getNewTimeseriesUrl(items, xAxis, yAxis, y2Axis);
						previewItems = items.map(i => i.withUrl(url));
					}
					return new Preview(previewItems, options.options, options.type, yAxis, y2Axis);
			} else if (options.type === config.NETCDF || options.type === config.MAPGRAPH || options.type === config.PHENOCAM){
				return new Preview(items, options.options, options.type, yAxis, y2Axis);
			}
		} else {
			return new Preview(ids.map(id => new CartItem(id)));
		}

		throw new Error('Could not initialize Preview');
	}

	restore(lookup: PreviewLookup, cart: Cart, objectsTable: DataObject[]) {
		if (this.hasPids) {
			return this.initPreview(lookup, cart, this.pids.map(pid => config.objectUriPrefix[config.envri] + pid), objectsTable, this.yAxis, this.y2Axis);
		} else {
			return this;
		}
	}


	withPids(pids: Sha256Str[]){
		this.pids = pids;
		return this;
	}

	withItemUrl(url: UrlStr){
		return new Preview(this.items.map(i => i.withUrl(url)), this.options, this.type, this.yAxis, this.y2Axis);
	}

	get hasPids(){
		return this.pids.length > 0;
	}

	get item() {
		return this.items[0];
	}

	get hasAllItems(){
		const itemPids = this.items.map(item => getLastSegmentInUrl(item.dobj));

		return this.hasPids && this.pids.every(pid => itemPids.includes(pid));
	}
}

export type PreviewAvailable = {
	previewType: PreviewType
}

export type PreviewNotAvailable = {
	previewType: null
	previewAbsenceReason: string
}

export type PreviewAvailability = PreviewAvailable | PreviewNotAvailable

function noPreview(reason: string): PreviewNotAvailable{
	return {previewType: null, previewAbsenceReason: reason}
}

export function previewAvailability(
	lookup: PreviewLookup | undefined, obj: {spec: string, dobj: string, submTime: Date}
): PreviewAvailability{

	if(obj.submTime.getTime() > Date.now())
		return noPreview("This data object is under moratorium")

	if(!lookup) return noPreview("Preview information has not loaded")

	const previewType = lookup.forDataObjSpec(obj.spec)?.type

	if(!previewType) return noPreview("This data object cannot be previewed")

	if(previewType === "NETCDF" && obj.spec !== config.netCdf.cfSpec && !(lookup.hasVarInfo(obj.dobj)))
		return noPreview("This NetCDF object cannot be previewed")

	return {previewType}
}

const onlyUniform = noPreview("Batch previews are only available for data of same type")

export function batchPreviewAvailability(
	lookup: PreviewLookup | undefined,
	objs: {spec: string, dobj: string, submTime: Date, dataset: Value}[]
): PreviewAvailability {
	if (!objs.length) return noPreview("No data objects selected")
	if (objs.length === 1) return previewAvailability(lookup, objs[0])

	const previewTypes = new Set<PreviewType>()

	if (!objs.every(obj => obj.dataset === objs[0].dataset)) return onlyUniform

	for(let i = 0; i < objs.length; i++){
		let preview = previewAvailability(lookup, objs[i])
		if (!preview.previewType) return noPreview("You have selected a data object that cannot be previewed")
		previewTypes.add(preview.previewType)
		if(previewTypes.size > 1) return onlyUniform
		if (i > 0 && preview.previewType !== config.TIMESERIES)
			return noPreview("You can only batch-preview plain time series data objects")
	}
	return {previewType: previewTypes.values().next().value}
}
