import config, {placeholders, numericFilterLabels, publicQueries, QueryName, Envri} from '../config';
import {Int} from "../types";
import {UrlStr} from "../backend/declarations";


const titles = {
	...placeholders[config.envri],
	...numericFilterLabels,
	preview: "Preview / Add to cart",
	publicQuery: "SPARQL queries",
	previewCsvDownload: "CSV download",
	previewURL: "Preview chart URL",
	keywordFilter: "Keyword",
	fileNameFilter: "Filename",
	pidFilter: "PID"
};

type HelpId = HelpItemName | UrlStr
type HelpDict = {[key in HelpId]?: HelpItem}

export default class HelpStorage {
	private readonly helpItems: HelpDict;
	private readonly visible: HelpId | undefined;

	constructor(helpStorage?: HelpDict, visible?: HelpId){
		this.helpItems = helpStorage ?? toDict(initItems);
		this.visible = visible;
	}

	get serialize(){
		return Object.assign({}, this);
	}

	static deserialize(json: HelpStorage) {
		const helpItems = Object.values(json.helpItems).flatMap(js => js ? [HelpItem.clone(js)] : []);
		return new HelpStorage(toDict(helpItems), json.visible);
	}

	getHelpItem(id: HelpId): HelpItem | undefined {
		return this.helpItems[id];
	}

	get visibleHelpItem(): HelpItem | undefined{
		return this.visible ? this.helpItems[this.visible] : undefined;
	}

	isActive(id: HelpId): boolean{
		return id === this.visible;
	}

	setAllInactive(): HelpStorage {
		return new HelpStorage(this.helpItems, undefined);
	}

	withItem(item: HelpItem): HelpStorage {
		const newVisibility = this.visible === item.id ? undefined : item.id;
		const newStorage = this.helpItems[item.id] === item
			? this.helpItems
			: {...this.helpItems, [item.id]: item};

		return (newVisibility === this.visible && newStorage === this.helpItems)
			? this
			: new HelpStorage(newStorage, newVisibility);
}

}

function toDict(items: HelpItem[]): HelpDict {
	return items.reduce<HelpDict>((acc, curr) => {
		acc[curr.id] = curr;
		return acc;
	}, {});
}

export type HelpStorageListEntry = {
	label?: Int | string
	comment?: string
	webpage?: UrlStr
}

export interface Documentation {
	txt: string,
	url: UrlStr
}

export type HelpItemName = keyof typeof titles;
export type EnvrifiedHelpMain = Record<Envri, string>;

export class HelpItem {
	constructor(
		readonly name: HelpItemName,
		readonly main: string | EnvrifiedHelpMain,
		readonly url?: UrlStr,
		readonly list?: HelpStorageListEntry[],
		readonly documentation?: Documentation[]
	){}

	get id(): HelpItemName | UrlStr {
		return this.url ?? this.name;
	}

	get header(): string {
		return titles[this.name];
	}

	get shouldFetchList(): boolean {
		return this.list !== undefined && this.list.length === 0;
	}

	get shouldUseExternalList(): boolean {
		return this.list === undefined;
	}

	withList(list: HelpStorageListEntry[]){
		return new HelpItem(this.name, this.main, this.url, list, this.documentation);
	}

	static clone(item: HelpItem): HelpItem{
		return new HelpItem(item.name, item.main, item.url, item.list, item.documentation);
	}
}

const {envri} = config;

const projectDescr = envri === 'SITES'
	? 'SITES Data Portal stores data from the following projects:'
	: 'In addition to the official ICOS data, Carbon Portal also stores data from various partner projects:';
const projectStr = envri === 'SITES'
	? 'SITES'
	: 'the Carbon Portal';

const numberFilterList = [
	{
		label: 'List',
		comment: 'Provide a list of numbers separated by spaces or a single number. E.g. 5 15 20.'
	},
	{
		label: 'Range',
		comment: 'Provide min and max values separated by a colon (":"). E.g. 50:150.'
	},
	{
		label: 'Limit',
		comment: 'Provide a number preceded by "<" (less than) or ">" (more than). E.g. <50.'
	}
];

const initItems: HelpItem[] = [

	new HelpItem('project', projectDescr, undefined, []),

	new HelpItem('station', 'If applicable, the research station that produced the original data for this data object. ' +
		'Typically, all data except elaborated products have a station of origin.'),

	new HelpItem(
		'stationclass',
		'Specifies the degree of affinity of the research station (and its data) to ICOS',
		undefined,
		[{
			label: 'ICOS',
			comment: 'Proper ICOS station (ICOS class 1 or 2)'
		},{
			label: 'Associated',
			comment: 'Associated with ICOS, but the data does not have the ICOS "quality stamp" (even if the data belongs to ICOS project)'
		}, {
			label: 'Other',
			comment: 'Research stations unrelated to ICOS (or whose data present here are not ICOS data)'
		}],
		undefined
	),
	
	new HelpItem(
		'ecosystem',
		{
			ICOS: 'Only applicable to measurement data from ecosystem stations where ecosystem-type information is available.',
			SITES: 'Type of ecosystem. Each type is described individually in the drop down.'
		}
	),

	new HelpItem('submitter', 'Organization credited for submission of the data object. ' +
		'Acquisition and production are credited independently of submission.'),

	new HelpItem('type', 'Kind of data object. Encompasses most of characteristics related to data content, ' +
		'that can be shared by multiple data objects, namely: ' +
		`${titles.project}, ${titles.theme}, ${titles.level}, ${titles.format}, and ` +
		'(in the case of tabular data with well-defined content) the list of columns.'),

	new HelpItem(
		'level',
		envri + ' distinguishes 4 levels of data in terms of how processed they are' + (envri === 'ICOS' ? ' (ranging from raw data to modelling results)' : '') + ':',
		undefined,
		envri === 'SITES'
			? [
				{
					label: 0 as Int,
					comment: 'Unprocessed instrument or digtalized data at full time resolution with all available supplemental information to be used in' +
						` subsequent processing. Stored internally but not distributed by ${projectStr}.Data are in physical units either directly provided` +
						' by the instruments or converted from engineer units.'
				},
				{
					label: 1 as Int,
					comment: 'Calibrated, quality filtered internal working data in physical units. In case L0 data are already calibrated, L0 and L1 are' +
						' identical. L1 is internal working data that is generated as intermediate steps in the data processing for Level 2. Level 1 data is of' +
						` intended for internal use  and normally not distributed by ${projectStr}.`
				},
				{
					label: 2 as Int,
					comment: 'Quality checked SITES data product. It is calibrated, quality filtered data in physical units, a aggregated to appropariate,' +
						` and within SITES community agreed, spatial and temporal output units and resolution. Distributed by ${projectStr}.`
				},
				{
					label: 3 as Int,
					comment: 'Environmental variables or products produced by SITES or anywere in the scientific community. The product is derived from' +
						` SITES L1 or L2 data  Distributed by ${projectStr}.`
				}
			]
			: [
				{
					label: 0 as Int,
					comment: 'Data in physical units either directly provided by the instruments or converted from engineer units (e.g. mV, mA, Ω) to' +
						' physical units at the Thematic Centre. They may have been filtered by a quality check (e.g. thresholds).',
					webpage: 'https://www.icos-cp.eu/data-services/data-collection/data-levels-quality'
				},
				{
					label: 1 as Int,
					comment: 'Near Real Time Data (NRT) or Internal Work data (IW).',
					webpage: 'https://www.icos-cp.eu/data-services/data-collection/data-levels-quality'
				},
				{
					label: 2 as Int,
					comment: `The final quality checked ICOS RI data set, published by the CFs, to be distributed through ${projectStr}. This level is` +
						' the ICOS-data product and free available for users.',
					webpage: 'https://www.icos-cp.eu/data-services/data-collection/data-levels-quality'
				},
				{
					label: 3 as Int,
					comment: 'All kinds of elaborated products by scientific communities that rely on ICOS data products are called Level 3 data.',
					webpage: 'https://www.icos-cp.eu/data-services/data-collection/data-levels-quality'
				}
			]
	),

	new HelpItem('format', 'Technical file format, indicating which software module is needed to read the data'),

	new HelpItem('variable', 'Variable used in the actual data objects, such as column name in a tabular time-series dataset. ' +
		'Usually a plain variable name, but can also refer to a group of variables using a regular expression. ' +
		'May be defined as optional, in which case explicitly selecting the variable is necessary to find the data objects that actually do contain it.'),

	new HelpItem('valType', 'A specific kind of physical quantity used in a certain scientific field. ' +
		'When applicable, is associated with a fixed unit of measurement and/or a single quantity kind.'),

	new HelpItem(
		'quantityUnit',
		'Unit of measurement of the physical quantity behind the variable in question. ' +
		nonStrictnessWarning(titles.quantityUnit)
	),
	
	new HelpItem(
		'quantityKind',
		'A general kind of physical quantity, for example volume, length, concentration. Can be basic or derived, standard or non-standard. ' +
			'Implies an associated physical quantity dimension but does not have a fixed unit of measurement. ' +
			nonStrictnessWarning(titles.quantityKind),
		undefined,
		[]
	),

	new HelpItem(
		'preview',
		'How \"Preview\" and \"Add to cart\" buttons work:',
		undefined,
		[
			{
				label: 'preview availability',
				comment: 'normally available for single-table data objects of levels 1 and 2 and for NetCDF data objects (level 3)'
			},
			{
				label: 'data cart availability',
				comment: 'available for logged-in users; allows batch-downloading of multiple data objects'
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
				label: 'adding to cart (logged-in users)',
				comment: 'select one or more data objects, click the \"Add to cart\" button; all the objects on the page can be selected using the \"Select all\" tickbox'
			}
		]
	),

	new HelpItem(
		'samplingHeight',
		'Only applicable for data sampled at various heights (mostly atmospheric data). The filter accepts decimal numbers, using "." as decimal character and' +
			' can be specified in three different ways. All filtering is inclusive. The filter "<50" will return data objects sampled at height 50 or less.',
		undefined,
		numberFilterList
	),

	new HelpItem(
		'fileSize',
		'The filter accepts decimal numbers, using "." as decimal character and can be specified in three different ways. All filtering is inclusive. ' +
			'The filter "<50000" will return data objects with a file size of 50 000 or less.',
		undefined,
		numberFilterList
	),

	new HelpItem(
		'publicQuery',
		'View SPARQL queries that are currently used in this application. Changes to filters are reflected in queries if applicable. Open them again to see updates.',
		undefined,
		(Object.keys(publicQueries) as QueryName[]).map(queryName => publicQueries[queryName])
	),

	new HelpItem(
		'previewCsvDownload',
		'This is an example URL for downloading the columns selected for preview and their related quality flags, if there are any',
		undefined,
		[{
			label: 'full CSV',
			comment: 'if column information is excluded from the URL, all the columns described in the metadata will be downloaded'
		},{
			label: 'multi-preview',
			comment: 'in the case of multiple-dataset preview, the URL will only provide data from one of the datasets'
		},{
			label: 'licencing',
			comment: 'you can only download the tabular data as CSV if you are logged in with the portal and have accepted the license agreement in your user profile'
		},{
			label: 'disclaimer',
			comment: `CSV download is an extra service offered by ${projectStr} on a best-effort basis; ` +
			'the CSV is typically an abridged (some columns may not be available) and transformed version of the original (even if the latter is a CSV)'
		}]
	),

	new HelpItem(
		'previewURL',
		'Useful for sharing the chart with a colleague, or for embedding it in a Web page as an HTML <iframe>'
	),

	new HelpItem('fileNameFilter', 'Paste in a complete filename, with extension. This filter does not search for partial filenames.'),
	new HelpItem('pidFilter', `Paste in ${envri} Data Portal's PID of a data object, either complete with prefix, ` +
		'or just the suffix (24 characters)'),
];

function nonStrictnessWarning(title: String): string{
	return `Note that ${title} selection does not filter data objects strictly, there may be false positives in the results. ` +
		`To avoid them, also filter by either ${titles.valType} or ${titles.variable}.`;
}