import CartItem, {CartItemSerialized} from './CartItem';
import {getNewTimeseriesUrl, getLastSegmentInUrl, isDefined} from '../utils';
import config, {PreviewType} from "../config";
import deepEqual from 'deep-equal';
import PreviewLookup, {PreviewInfo} from "./PreviewLookup";
import Cart from "./Cart";
import {ExtendedDobjInfo, ObjectsTable} from "./State";
import {IdxSig, Sha256Str, UrlStr} from "../backend/declarations";
import { Value } from './SpecTable';


export interface PreviewOption {
	varTitle: string
	valTypeLabel: string
}

export function previewVarCompare(po1: PreviewOption, po2: PreviewOption): number{
	return po1.varTitle.localeCompare(po2.varTitle)
}

export type PreviewSettings = {
	// dygraph-light - Time Series
	x?: string
	y?: string
	y2?: string
	type?: string
	legendLabels?: string
	legendLabelsY2?: string
	linking?: string
	// imagezipview - Phenocam/multi-image zip
	img?: string
	// netcdf
	varName?: string
	extraDim?: string
	date?: string
	gamma?: string
	center?: string
	zoom?: string
	color?: string
	// map-graph - uses y2 and center as well
	y1?: string
	map?: string
}

const previewSettingsKeys = [
	'x',
	'y',
	'y2',
	'type',
	'legendLabels',
	'legendLabelsY2',
	'linking',
	'img',
	'varName',
	'extraDim',
	'date',
	'gamma',
	'center',
	'zoom',
	'color',
	'y1',
	'map'
]

export interface PreviewSerialized {
	items: CartItemSerialized[]
	options: PreviewOption[]
	type: PreviewType | undefined
	previewSettings: PreviewSettings
}

export default class Preview {
	public readonly items: CartItem[];
	public pids: Sha256Str[];
	public readonly options: PreviewOption[];
	public readonly type: PreviewType | undefined;
	public previewSettings: PreviewSettings;

	constructor(items?: CartItem[], options?: PreviewOption[], type?: PreviewType){
		this.items = items ?? [];
		this.pids = this.items.map(item => getLastSegmentInUrl(item.dobj));
		this.options = options ?? [];
		this.type = type;
		this.previewSettings = this.item?.urlParams ? Preview.allowlistPreviewSettings(this.item.urlParams) : {};
	}

	static allowlistPreviewSettings(urlParams: IdxSig | PreviewSettings): PreviewSettings {
		const allowedPreviewSettings: PreviewSettings = {};
		for (const key in urlParams) {
			if (previewSettingsKeys.includes(key)) {
				allowedPreviewSettings[key as keyof PreviewSettings] = urlParams[key as keyof PreviewSettings];
			}
		}
		return allowedPreviewSettings;
	}

	get serialize(): PreviewSerialized {
		return {
			items: this.items.map(item => item.serialize),
			options: this.options,
			type: this.type,
			previewSettings: this.previewSettings,
		};
	}

	static deserialize(jsonPreview: PreviewSerialized) {
		const items: CartItem[] = jsonPreview.items.map(item => new CartItem(item.id, item.dataobject, item.type, item.url));
		const options = jsonPreview.options;
		const type = jsonPreview.type;

		return new Preview(items, options, type);
	}

	initPreview(lookup: PreviewLookup, cart: Cart, ids: UrlStr[], objectsTable: ObjectsTable[], yAxis?: string, y2Axis?: string) {
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
						const url = getNewTimeseriesUrl(items, xAxis, this.previewSettings);
						previewItems = items.map(i => i.withUrl(url));
					}
					return new Preview(previewItems, options.options, options.type);
			} else if (options.type === config.NETCDF || options.type === config.MAPGRAPH || options.type === config.PHENOCAM){
				return new Preview(items, options.options, options.type);
			}
		} else {
			return new Preview(ids.map(id => new CartItem(id)));
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

	withPids(pids: Sha256Str[], previewSettings?: PreviewSettings){
		this.pids = pids;
		this.previewSettings = previewSettings ?? {};
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
	return {previewType: previewTypes.values().next().value!}
}
