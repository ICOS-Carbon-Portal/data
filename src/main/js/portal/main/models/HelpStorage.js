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
			txt: ri.comment || 'Not available',
			webpage: ri.webpage
		};
	});
};

const initItems = [
	new Item(
		'project',
		'Project',
		'Description of Project',
		[]
	),
	new Item(
		'level',
		'Data Level',
		'Description of Data level',
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
	new Item(
		'quantityKind',
		'Quantity Kind',
		'Description of Quantity kind'
	),
	new Item(
		'preview',
		'Preview',
		'Description of how to use preview'
	)
];
