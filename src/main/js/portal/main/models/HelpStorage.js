import config, {placeholders} from '../config';

const titles = placeholders[config.envri];

export default class HelpStorage{
	constructor(storage, visibility){
		this.storage = storage || initItems;
		this.visibility = visibility || this.storage.map(_ => false);
	}

	get serialize(){
		return Object.assign({}, this);
	}

	static deserialize(json) {
		const storage = json.storage.map(({name, header, main, list}) => new Item(name, header, main, list));
		return new HelpStorage(storage, json.visibility);
	}

	has(name){
		return this.storage.some(item => item.name === name);
	}

	getHelpItem(name){
		return this.storage.find(item => item.name === name);
	}

	get visibleHelpItem(){
		const idx = this.visibility.findIndex(v => v);
		return this.storage[idx];
	}

	isActive(name){
		const idx = this.storage.findIndex(item => item.name === name);
		return this.visibility[idx];
	}

	shouldFetchList(name){
		const item = this.getHelpItem(name);
		return item ? item.shouldFetchList : false;
	}

	withUpdatedItem(newItem){
		let visibility = this.visibility.slice();
		const storage = this.storage.map((item, idx) => {
			if (item.name === newItem.name){
				visibility[idx] = !visibility[idx];
				return newItem;
			} else {
				visibility[idx] = false;
				return item;
			}
		});

		return new HelpStorage(storage, visibility);
	}
}

class Item {
	constructor(name, header, main, list){
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

	withList(list){
		return new Item(this.name, this.header, this.main, parseResourceInfo(list));
	}
}

const parseResourceInfo = resourceInfo => {
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

const initItems = [

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
		envri + ' distinguishes 4 levels of data in terms of how processed they are (ranging from raw data to modelling results):',
		parseResourceInfo([
			{
				label: 0,
				comment: 'Data in physical units either directly provided by the instruments or converted from engineer units (e.g. mV, mA, Ω) to' +
					' physical units at the Thematic Centre. They may have been filtered by a quality check (e.g. thresholds).',
				webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
			},
			{
				label: 1,
				comment: 'Near Real Time Data (NRT) or Internal Work data (IW).',
				webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
			},
			{
				label: 2,
				comment: 'The final quality checked ICOS RI data set, published by the CFs, to be distributed through the Carbon Portal. This level is' +
					' the ICOS-data product and free available for users.',
				webpage: 'https://www.icos-cp.eu/about-icos-data#Sect2'
			},
			{
				label: 3,
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
