import config, {placeholders} from '../config';
import {Int} from "../types";
import {UrlStr} from "../backend/declarations";
import {ColNames} from "./CompositeSpecTable";
import {getLastSegmentInUrl} from "../utils";


const titles = placeholders[config.envri];

export default class HelpStorage {
	private readonly storage: Item[];
	private readonly visibility: boolean[];

	constructor(storage?: Item[], visibility?: boolean[]){
		this.storage = storage ?? initItems;
		this.visibility = visibility ?? this.storage.map(_ => false);
	}

	get serialize(){
		return Object.assign({}, this);
	}

	static deserialize(json: HelpStorage) {
		const storage = json.storage.map(({name, header, main, list}) => new Item(name, header, main, list));
		return new HelpStorage(storage, json.visibility);
	}

	has(name: string){
		return this.storage.some(item => item.name === name);
	}

	get names(){
		return this.storage.map(item => item.name);
	}

	getHelpItem(name: string){
		return this.storage.find(item => item.name === name);
	}

	get visibleHelpItem(){
		const idx = this.visibility.findIndex(v => v);
		return this.storage[idx];
	}

	isActive(name: string, url?: UrlStr){
		const helpName = url ?? name;
		const idx = this.storage.findIndex(item => item.name === helpName);
		return this.visibility[idx];
	}

	shouldFetchList(name: string){
		const item = this.getHelpItem(name);
		return item ? item.shouldFetchList : false;
	}

	setAllInactive(){
		return new HelpStorage(this.storage);
	}

	withUpdatedItem(existingItem: Item){
		let visibility = this.visibility.slice();
		const storage = this.storage.map((item, idx) => {
			if (item.name === existingItem.name){
				visibility[idx] = !visibility[idx];
				return existingItem;
			} else {
				visibility[idx] = false;
				return item;
			}
		});

		return new HelpStorage(storage, visibility);
	}

	withNewItem(newItem: Item){
		const newStorage = this.storage.concat(newItem);
		const newVisibility = newStorage.map((s, idx) => idx === newStorage.length - 1);
		return new HelpStorage(newStorage, newVisibility);
	}
}

export type HelpStorageListEntry = {
	label: Int | string
	comment: string
	webpage?: UrlStr
}
type ListEntryParsed = {
	lbl?: Int | string
	txt: string
	webpage?: UrlStr
}
export type Documentation = {
	txt: string,
	url: UrlStr
}
type HelpItemName = ColNames | "preview" | string
export class Item {
	constructor(readonly name: HelpItemName, readonly header: string, readonly main: string, readonly list?: HelpStorageListEntry[] | ListEntryParsed[]){
		// list === undefined -> Never show list
		// list === [] -> Fetch list from backend when requested
		this.name = name;
		this.header = header;
		this.main = main;
		this.list = list;
	}

	get shouldFetchList(){
		return this.list !== undefined && this.list.length === 0;
	}

	withList(list: HelpStorageListEntry[]){
		return new Item(this.name, this.header, this.main, parseResourceInfo(list));
	}
}

export class ItemExtended extends Item {
	constructor(readonly name: HelpItemName, readonly header: string, readonly main: string, readonly list?: ListEntryParsed[], readonly documentation?: Documentation[]){
		super(name, header, main, list);
	}
}

const parseResourceInfo = (resourceInfo: HelpStorageListEntry[]): ListEntryParsed[] => {
	return resourceInfo.map(ri => {
		return {
			lbl: ri.label,
			txt: ri.comment || '',
			webpage: ri.webpage
		};
	});
};

const {envri} = config;

const projectDescr = envri === 'SITES'
	? 'SITES Data Portal stores data from the following projects:'
	: 'In addition to the official ICOS data, Carbon Portal also stores data from various partner projects:';

const initItems: Item[] = [

	new Item('project', titles.project, projectDescr, []),

	new Item('station', titles.station, 'If applicable, the research station that produced the original data for this data object. ' +
		'Typically, all data except elaborated products have a station of origin.'),

	new Item('submitter', titles.submitter, 'Organization credited for submission of the data object. ' +
		'Acquisition and production are credited independently of submission.'),

	new Item('type', titles.type, 'Kind of data object. Encompasses most of characteristics related to data content, ' +
		'that can be shared by multiple data objects, namely: ' +
		`${titles.project}, ${titles.theme}, ${titles.level}, ${titles.format}, and ` +
		'(in the case of tabular data with well-defined content) the list of columns.'),

	new Item(
		'level',
		titles.level,
		envri + ' distinguishes 4 levels of data in terms of how processed they are' + (envri === 'ICOS' ? ' (ranging from raw data to modelling results)' : '') + ':',
		envri === 'SITES'
			? parseResourceInfo([
				{
					label: 0 as Int,
					comment: 'Unprocessed instrument or digtalized data at full time resolution with all available supplemental information to be used in' +
						' subsequent processing. Stored internally but not distributed by the Data Portal.Data are in physical units either directly provided' +
						' by the instruments or converted from engineer units.'
				},
				{
					label: 1 as Int,
					comment: 'Calibrated, quality filtered internal working data in physical units. In case L0 data are already calibrated, L0 and L1 are' +
						' identical. L1 is internal working data that is generated as intermediate steps in the data processing for Level 2. Level 1 data is of' +
						' intended for internal use  and normally not distributed by the Data Portal.'
				},
				{
					label: 2 as Int,
					comment: 'Quality checked SITES data product. It is calibrated, quality filtered data in physical units, a aggregated to appropariate,' +
						' and within SITES community agreed, spatial and temporal output units and resolution. Distributed by the Data Portal.'
				},
				{
					label: 3 as Int,
					comment: 'Environmental variables or products produced by SITES or anywere in the scientific community. The product is derived from' +
						' SITES L1 or L2 data  Distributed by the Data Portal.'
				}
			])
			: parseResourceInfo([
				{
					label: 0 as Int,
					comment: 'Data in physical units either directly provided by the instruments or converted from engineer units (e.g. mV, mA, Ω) to' +
						' physical units at the Thematic Centre. They may have been filtered by a quality check (e.g. thresholds).',
					webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
				},
				{
					label: 1 as Int,
					comment: 'Near Real Time Data (NRT) or Internal Work data (IW).',
					webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
				},
				{
					label: 2 as Int,
					comment: 'The final quality checked ICOS RI data set, published by the CFs, to be distributed through the Carbon Portal. This level is' +
						' the ICOS-data product and free available for users.',
					webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
				},
				{
					label: 3 as Int,
					comment: 'All kinds of elaborated products by scientific communities that rely on ICOS data products are called Level 3 data.',
					webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
				}
			])
	),

	new Item('format', titles.format, 'Technical file format, indicating which software module is needed to read the data'),

	new Item(
		'quantityKind',
		titles.quantityKind,
		'A general kind of physical quantity, for example volume, length, concentration. Can be basic or derived, standard or non-standard. ' +
			'Implies an associated physical quantity dimension but does not have a fixed unit of measurement.',
		[]
	),

	new Item('valType', titles.valType, 'A specific kind of physical quantity used in a certain scientific field. ' +
		'When applicable, is associated with a fixed unit of measurement and/or a single quantity kind.'),

	new Item(
		'preview',
		'Preview / Add to cart',
		'How \"Preview\" and \"Add to cart\" buttons work:',
		parseResourceInfo([
			{
				label: 'preview availability',
				comment: 'normally available for single-table data objects of levels 1 and 2 and for NetCDF data objects (level 3)'
			},
			{
				label: 'how to preview',
				comment: 'select the data object(s) by ticking checkboxes, click the preview button (if active)'
			},
			{
				label: 'multi-object preview',
				comment: 'tabular objects of the same data type can be previewed simultaneously; if coming from the same station and from disjoint time intervals, ' +
					'the datasets are concatenated, otherwise, presented as different plot lines'
			},
			{
				label: 'adding to cart',
				comment: 'select one or more data objects, click the \"Add to cart\" button; all the objects on the page can be selected using the \"Select all\" tickbox'
			}
		])
	)
];
