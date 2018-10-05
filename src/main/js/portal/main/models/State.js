import Preview from "./Preview";
import FilterFreeText from "./FilterFreeText";
import FilterTemporal from "./FilterTemporal";
import CompositeSpecTable from "./CompositeSpecTable";
import Lookup from "./Lookup";
import Cart from "./Cart";
import Paging from "./Paging";
import config, {prefixes} from "../config";


// hashKeys objects are automatically represented in the URL hash (with some special cases).
// Changes to any of these objects are automatically saved in browser history state
// If other objects needs to be saved in browser history, use method 'updateAndSave'
const hashKeys = [
	'route',
	'filterCategories',
	'filterTemporal',
	'filterFreeText',
	'tabs',
	'page',
	'preview'
];

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
			tabs: {},
			page: 0
		}, state);
	}

	update(){
		const updates = Array.from(arguments);
		return new State(Object.assign.apply(Object, [{ts: Date.now()}, this].concat(updates)));
	}

	updateAndSave(){
		const newState = this.update(...arguments);
		history.replaceState(newState.serialize, null, window.location);

		return newState;
	}

	static deserialize(jsonObj, cart){
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
			preview: this.preview.serialize
		});
	}

	get toPlainObject() {
		return Object.assign({}, this);
	}
}

// Hash to state and state to hash below
export const getStateFromHash = () => {
	const state = hashToState(getCurrentHash());
	return managePrefixes(state);
};

//No # in the beginning!
const hashToState = hash => {
	try {
		const state = JSON.parse(hash);
		return jsonToState(state);
	} catch(err) {
		return {};
	}
};

const getStateFromStore = storeState => {
	return hashKeys.reduce((acc, key) => {
		acc[key] = storeState[key];
		return acc;
	}, {});
};

const simplifyState = state => {
	return Object.assign(state, {
		filterTemporal: state.filterTemporal ? state.filterTemporal.serialize : {},
		filterFreeText: state.filterFreeText.serialize,
		preview: state.preview.pids
	});
};

const jsonToState = state => {
	const stateFromHash = Object.assign({}, state);

	try {
		state.route = state.route || config.DEFAULT_ROUTE;
		state.filterCategories = state.filterCategories || {};
		state.filterTemporal = state.filterTemporal
			? new FilterTemporal().restore(state.filterTemporal)
			: new FilterTemporal();
		state.filterFreeText = state.filterFreeText === undefined
			? new FilterFreeText()
			: FilterFreeText.deserialize(state.filterFreeText);
		state.tabs = state.tabs || {};
		state.page = state.page || 0;
		state.preview = new Preview().withPids(state.preview || []);

	} catch(err) {
		console.log({stateFromHash, state, err});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = storeState => {
	if (storeState.route === config.ROUTE_SEARCH){
		delete storeState.route;
	}
};

const specialCases = state => {
	if (state.route === config.ROUTE_PREVIEW) {
		return {
			route: state.route,
			preview: state.preview
		};
	} else {
		delete state.preview;
	}

	if (state.route === config.ROUTE_CART){
		return {
			route: state.route
		}
	}

	if (state.route === config.ROUTE_SEARCH){
		delete state.route;
	}

	return state;
};

function getCurrentHash(){
	return decodeURIComponent(window.location.hash.substr(1));
}

export const hashUpdater = store => () => {
	const state = store.getState();
	const newHash = stateToHash(state);
	const oldHash = getCurrentHash();

	if (newHash !== oldHash){
		newHash === ''
			? history.pushState(state.serialize, null, window.location.href.split('#')[0])
			: window.location.hash = encodeURIComponent(newHash);
	}
};

const stateToHash = state => {
	const currentStoreState = getStateFromStore(state);
	const simplifiedStoreState = simplifyState(currentStoreState);
	const reducedStoreState = reduceState(simplifiedStoreState);
	handleRoute(reducedStoreState);
	const withSpecialCases = specialCases(reducedStoreState);
	const final = managePrefixes(withSpecialCases);

	return Object.keys(final).length ? JSON.stringify(final) : '';
};

const managePrefixes = (state = {}) => {
	if (Object.keys(state).length === 0) return state;
	if (state.filterCategories === undefined || Object.keys(state.filterCategories).length === 0) return state;

	const categories = Object.keys(state.filterCategories);
	const appPrefixes = prefixes[config.envri];
	const prefixValues = Object.keys(appPrefixes).map(key => appPrefixes[key]);
	const fc = state.filterCategories;

	return Object.assign({}, state, {
		filterCategories: categories.reduce((acc, category) => {
			const prefix = appPrefixes[category] || '';

			acc[category] = fc[category].map(value => {

				if (Number.isInteger(value)) return value;

				return value.startsWith('http://') || value.startsWith('https://')
					? prefixValues.some(pv => value.startsWith(pv))
						? value.slice(prefix.length)
						: value
					: prefix + value;
			});

			return acc;
		}, {})
	});
};

const reduceState = state => {
	return Object.keys(state).reduce((acc, key) => {

		if (Array.isArray(state[key]) && state[key].length){
			acc[key] = state[key];

		} else if (typeof state[key] === 'object') {
			const part = reduceState(state[key]);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (typeof state[key] === 'string'){
			acc[key] = state[key];

		} else if (typeof state[key] === 'number' && state[key] !== 0){
			acc[key] = state[key];
		}

		return acc;
	}, {});
};
