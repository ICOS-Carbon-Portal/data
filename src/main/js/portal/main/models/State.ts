import Preview from "./Preview";
import FilterFreeText from "./FilterFreeText";
import FilterTemporal from "./FilterTemporal";
import CompositeSpecTable from "./CompositeSpecTable";
import Lookup from "./Lookup";
import Cart from "./Cart";
import Paging from "./Paging";
import HelpStorage from './HelpStorage';
import config, {prefixes} from "../config";
import deepequal from 'deep-equal';
import {KeyAnyVal, ThenArg, UrlStr} from "../backend/declarations";
import {Store} from "redux";
import {fetchKnownDataObjects, getExtendedDataObjInfo} from "../backend";
import {DataObject} from "./CartItem";
import {DataObject as DO} from "../../../common/main/metacore";


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
	'id',
	'preview'
];

export type Routes = typeof config.DEFAULT_ROUTE | typeof config.ROUTE_CART | typeof config.ROUTE_METADATA | typeof config.ROUTE_PREVIEW | typeof config.ROUTE_SEARCH;

export interface Profile {
	icosLicenceOk: boolean
	givenName: string
	surname: string
	orcid: string
	affiliation: string
	affiliation2: string
	workPhone: string
	mobilePhone: string
	streetAddress: string
	city: string
	zipCode: string
	country: string
	gender: "Male" | "Female"
	birthYear: string
}

export interface User {
	profile: Profile | {}
	email?: string
}

export type ObjectsTable = ThenArg<typeof fetchKnownDataObjects> & ThenArg<typeof getExtendedDataObjInfo> & DataObject;
export interface ExtendedDobjInfo {
	dobj: UrlStr
	station: string
	stationId: string
	samplingHeight: number
	theme: string
	themeIcon: UrlStr
}

export interface MetaDataObject extends DO{
	coverageGeoJson: string
}

export interface State {
	ts: number | undefined
	isRunningInit: boolean
	showDeprecated: boolean
	route: Routes
	filterCategories: any
	filterTemporal: FilterTemporal
	filterFreeText: FilterFreeText
	user: User
	lookup: Lookup | undefined;
	specTable: CompositeSpecTable
	extendedDobjInfo: ExtendedDobjInfo[]
	formatToRdfGraph: {}
	objectsTable: ObjectsTable[]
	sorting: {
		varName: string | undefined,
		ascending: boolean
	}
	paging: Paging
	cart: Cart
	id: UrlStr | undefined;
	metadata?: MetaDataObject & {id: UrlStr}
	station: {} | undefined
	preview: Preview
	toasterData: {} | undefined;
	batchDownloadStatus: {
		isAllowed: boolean,
		ts: number
	}
	checkedObjectsInSearch: UrlStr[]
	checkedObjectsInCart: []
	tabs: {tabName?: string, selectedTabId?: string, searchTab?: number, resultTab?: number}
	page: number
	tsSettings: {}
	helpStorage: HelpStorage
}

export const defaultState: State = {
	ts: Date.now(),
	isRunningInit: false,
	showDeprecated: false,
	route: config.DEFAULT_ROUTE,
	filterCategories: {},
	filterTemporal: new FilterTemporal(),
	filterFreeText: new FilterFreeText(),
	user: {
		profile: {},
		email: undefined
	},
	lookup: undefined,
	specTable: new CompositeSpecTable({}),
	extendedDobjInfo: [],
	formatToRdfGraph: {},
	objectsTable: [],
	sorting: {
		varName: undefined,
		ascending: true
	},
	paging: new Paging({objCount: 0}),
	cart: new Cart(),
	id: undefined,
	metadata: undefined,
	station: undefined,
	preview: new Preview(),
	toasterData: undefined,
	batchDownloadStatus: {
		isAllowed: false,
		ts: 0
	},
	checkedObjectsInSearch: [],
	checkedObjectsInCart: [],
	tabs: {tabName: undefined, selectedTabId: undefined, searchTab: undefined, resultTab: undefined},
	page: 0,
	tsSettings: {},
	helpStorage: new HelpStorage()
};

const update = (state: State, updates: any) => {
	return Object.assign({}, state, updates, {ts: Date.now()});
};

// history state is only automatically updated when URL changes. Use this method to force
// history to store current state.
const updateAndSave = (state: State, updates: any) => {
	const newState = update(state, updates);
	history.replaceState(serialize(newState), '', window.location.href);

	return newState;
};

const serialize = (state: State) => {
	return Object.assign({}, state, {
		filterTemporal: state.filterTemporal.serialize,
		filterFreeText: state.filterFreeText.serialize,
		lookup: undefined,
		specTable: state.specTable.serialize,
		paging: state.paging.serialize,
		cart: undefined,
		preview: state.preview.serialize,
		helpStorage: state.helpStorage.serialize
	});
};

const deserialize = (jsonObj: State, cart: Cart) => {
	const specTable = CompositeSpecTable.deserialize(jsonObj.specTable);
	const props: State = Object.assign({}, jsonObj, {
		filterTemporal: FilterTemporal.deserialize(jsonObj.filterTemporal),
		filterFreeText: FilterFreeText.deserialize(jsonObj.filterFreeText),
		lookup: new Lookup(specTable),
		specTable,
		paging: Paging.deserialize(jsonObj.paging),
		cart,
		preview: Preview.deserialize(jsonObj.preview),
		helpStorage: HelpStorage.deserialize(jsonObj.helpStorage)
	});

	return props;
};

// Hash to state and state to hash below
const getStateFromHash = (hash: string | undefined = undefined) => {
	const state = hash === undefined
		? jsonToState(parseHash(getCurrentHash()))
		: jsonToState(parseHash(decodeURIComponent(hash)));
	return extendUrls(state);
};

//No # in the beginning!
const parseHash = (hash: string) => {
	try {
		return JSON.parse(hash);
	} catch(err) {
		return {};
	}
};

const hashToState = () => {
	try {
		return JSON.parse(getCurrentHash());
	} catch(err) {
		return {};
	}
};

const getStateFromStore = (storeState: State & KeyAnyVal) => {
	return hashKeys.reduce((acc: KeyAnyVal, key: string) => {
		acc[key] = storeState[key];
		return acc;
	}, {});
};

const simplifyState = (state: State) => {
	return Object.assign(state, {
		filterTemporal: state.filterTemporal ? state.filterTemporal.serialize : {},
		filterFreeText: state.filterFreeText.serialize,
		preview: state.preview.pids
	});
};

const jsonToState = (state: State) => {
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
		// state.id = undefined;
		// state.id = '';
		state.id = state.id === undefined
			? undefined
			: config.previewIdPrefix[config.envri] + state.id;
	} catch(err) {
		console.log({stateFromHash, state, err});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = (storeState: State) => {
	if (storeState.route === config.ROUTE_SEARCH){
		delete storeState.route;
	}
};

const specialCases = (state: State) => {
	if (state.route === config.ROUTE_METADATA) {
		return {
			route: state.route,
			id: state.id,
		};
	} else {
		delete state.id;
		delete state.metadata;
	}

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

const hashUpdater = (store: Store) => () => {
	const state = store.getState();
	const newHash = stateToHash(state);
	const oldHash = getCurrentHash();

	if (newHash !== oldHash){
		newHash === ''
			? history.pushState(serialize(state), '', window.location.href.split('#')[0])
			: window.location.hash = encodeURIComponent(newHash);
	}
};

const storeOverwatch = (store: Store, select: Function, onChange: Function) => {
	let currentState: State;

	const handleChange = () => {
		const nextState = select(store.getState());

		if (!deepequal(currentState, nextState)){
			onChange(currentState, nextState, select);
			currentState = nextState;
		}
	};

	handleChange();

	// Return unsubscriber
	return store.subscribe(handleChange);
};

const stateToHash = (state: State) => {
	const currentStoreState = getStateFromStore(state);
	const simplifiedStoreState = simplifyState(currentStoreState as State);
	const reducedStoreState = reduceState(simplifiedStoreState);
	handleRoute(reducedStoreState as State);
	const withSpecialCases = specialCases(reducedStoreState as State);
	const final = shortenUrls(withSpecialCases as State);

	return Object.keys(final).length ? JSON.stringify(final) : '';
};

const shortenUrls = (state: State = ({} as State)) => {
	return managePrefixes(state,
		(prefix: any, value: string) => {
			if (Array.isArray(prefix)){
				const prefixObj = prefix.find(p => value.startsWith(p.value));
				if (prefixObj === undefined) throw new Error(`Could not find prefix for ${value}`);
				return prefixObj.prefix + value.slice(prefixObj.value.length);
			} else {
				return value.slice(prefix.length);
			}
		});
};

const extendUrls = (state: State = ({} as State)) => {
	return managePrefixes(state,
		(prefix: any, value: string) => {
			if (value.startsWith('http://') || value.startsWith('https://')) return value;
			if (Array.isArray(prefix)){
				const pLetter = value.slice(0, 1);
				const prefixObj = prefix.find(p => p.prefix === pLetter);
				if (prefixObj === undefined) throw new Error(`Could not find prefix for ${value}`);
				return prefixObj.value + value.slice(1);
			} else {
				return prefix + value;
			}
		});
};

const managePrefixes = (state: State = ({} as State), transform: Function) => {
	if (Object.keys(state).length === 0) return state;
	if (state.filterCategories === undefined || Object.keys(state.filterCategories).length === 0) return state;

	const categories = Object.keys(state.filterCategories);
	const appPrefixes = prefixes[config.envri];
	const fc = state.filterCategories;

	return Object.assign({}, state, {
		filterCategories: categories.reduce((acc: KeyAnyVal, category: string) => {
			acc[category] = fc[category].map((value: string) => {
				if (Number.isInteger(parseFloat(value))) return value;

				const prefix = (appPrefixes as KeyAnyVal)[category];
				if (prefix === undefined) return value;

				return transform(prefix, value);
			});

			return acc;
		}, {})
	});
};

const reduceState = (state: State & KeyAnyVal) => {
	return Object.keys(state).reduce((acc: KeyAnyVal, key: string) => {

		if (Array.isArray(state[key]) && state[key].length){
			acc[key] = state[key];

		} else if (typeof state[key] === 'object') {
			const part = reduceState(state[key]);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (state.route === config.ROUTE_METADATA && key === 'id' && state[key] && state[key]!.length > 0){
			acc[key] = state[key]!.split('/').pop();

		} else if (typeof state[key] === 'string'){
			acc[key] = state[key];

		} else if (typeof state[key] === 'number' && state[key] !== 0){
			acc[key] = state[key];

		}

		return acc;
	}, {});
};

export default {
	update,
	updateAndSave,
	serialize,
	deserialize,
	getStateFromHash,
	hashToState,
	hashUpdater,
	storeOverwatch,
	stateToHash,
	shortenUrls,
	extendUrls
};
