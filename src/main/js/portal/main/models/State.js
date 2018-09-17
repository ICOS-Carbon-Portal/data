import Preview from "./Preview";
import FilterFreeText from "./FilterFreeText";
import FilterTemporal from "./FilterTemporal";
import CompositeSpecTable from "./CompositeSpecTable";
import Lookup from "./Lookup";
import Cart from "./Cart";
import Paging from "./Paging";


export default class State{
	constructor(state = {}){
		Object.assign(this, {
			ts: Date.now(),
			isRunningInit: false,
			filterCategories: {},
			filterTemporal: new FilterTemporal(),
			filterFreeText: new FilterFreeText(),
			user: {},
			lookup: undefined,
			specTable: new CompositeSpecTable({}),
			extendedDobjInfo: [],
			formatToRdfGraph: {},
			objectsTable: [],
			sorting: {
				isEnabled: false,
				varName: undefined,
				ascending: true
			},
			paging: {},
			cart: new Cart(),
			preview: new Preview(),
			toasterData: undefined,
			batchDownloadStatus: {
				isAllowed: false,
				ts: 0
			},
			checkedObjectsInSearch: [],
			checkedObjectsInCart: [],
			tabs: {}
		}, state);
	}

	update(){
		const updates = Array.from(arguments);
		return new State(Object.assign.apply(Object, [{ts: Date.now()}, this].concat(updates)));
	}

	updateAndSave(){
		const newState = this.update.apply(this, arguments);
		history.replaceState(newState.serialize, null, window.location);

		return newState;
	}

	static deserialize(jsonObj, cart){
		console.log({jsonObj});
		const specTable = CompositeSpecTable.deserialize(jsonObj.specTable);

		return new State(
			Object.assign(jsonObj, {
				filterTemporal: FilterTemporal.deserialize(jsonObj.filterTemporal),
				filterFreeText: FilterFreeText.deserialize(jsonObj.filterFreeText),
				lookup: new Lookup(specTable),
				specTable,
				paging: Paging.deserialize(jsonObj.paging),
				cart,
				preview: Preview.deserialize(jsonObj.preview)
			})
		);
	}

	get serialize(){
		return Object.assign({}, this, {
			filterTemporal: this.filterTemporal.serialize,
			filterFreeText: this.filterFreeText.serialize,
			lookup: undefined,
			specTable: this.specTable.serialize,
			paging: this.paging.serialize,
			cart: undefined,
			preview: this.preview.serialize,
		});
	}

	get toPlainObject() {
		return Object.assign({}, this);
	}
}
