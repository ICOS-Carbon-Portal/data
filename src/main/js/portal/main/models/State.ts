import Preview, {PreviewSerialized} from "./Preview";
import FilterTemporal, {SerializedFilterTemporal} from "./FilterTemporal";
import CompositeSpecTable, {BasicsColNames, ColumnMetaColNames, OriginsColNames} from "./CompositeSpecTable";
import Lookup from "./Lookup";
import Cart from "./Cart";
import Paging from "./Paging";
import HelpStorage from './HelpStorage';
import config, {prefixes, CategoryType, CategPrefix} from "../config";
import deepequal from 'deep-equal';
import {KeyAnyVal, ThenArg, UrlStr, Sha256Str, KeyStrVal} from "../backend/declarations";
import {Store} from "redux";
import {fetchKnownDataObjects, getExtendedDataObjInfo} from "../backend";
import {DataObject} from "./CartItem";
import {DataObject as DO} from "../../../common/main/metacore";
import SpecTable, {Row} from "./SpecTable";


// hashKeys objects are automatically represented in the URL hash (with some special cases).
// Changes to any of these objects are automatically saved in browser history state
// If other objects needs to be saved in browser history, use method 'updateAndSave'
const hashKeys = [
	'route',
	'filterCategories',
	'filterTemporal',
	'filterPids',
	'tabs',
	'page',
	'id',
	'preview'
];

export type Route = 'search' | 'metadata' | 'preview' | 'cart';

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

export interface WhoAmI {email: string | null}
export interface User extends WhoAmI {
	profile: Profile | {}
}

type KnownDataObject = ThenArg<typeof fetchKnownDataObjects>['rows'][0]
export type ExtendedDobjInfo = ThenArg<typeof getExtendedDataObjInfo>[0]
export type ObjectsTable = KnownDataObject & ExtendedDobjInfo & DataObject & Row<BasicsColNames>;

export interface MetaDataObject extends DO{
	coverageGeoJson: string
}

export interface SearchOptions {
	showDeprecated: boolean
}

//TODO Investigate whether the type should be Filter, and whether Value needs to have 'number' on the list of types
export type CategFilters = {[key in CategoryType]?: string[] | null}

export type TsSetting = { 'x': string } & { 'y': string } & { 'type': 'line' | 'scatter' }
export type TsSettings = {
	[key: string]: TsSetting
}

export interface State {
	ts: number | undefined
	isRunningInit: boolean
	searchOptions: SearchOptions
	route: Route
	filterCategories: CategFilters
	filterTemporal: FilterTemporal
	filterPids: Sha256Str[]
	user: User
	lookup: Lookup | undefined;
	labelLookup: KeyStrVal;
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
	checkedObjectsInCart: UrlStr[]
	tabs: {tabName?: string, selectedTabId?: string, searchTab?: number, resultTab?: number}
	page: number
	tsSettings: TsSettings
	helpStorage: HelpStorage
}

const emptyCompositeSpecTable = new CompositeSpecTable(
	new SpecTable<BasicsColNames>([], [], {}),
	new SpecTable<ColumnMetaColNames>([], [], {}),
	new SpecTable<OriginsColNames>([], [], {})
);

export const defaultState: State = {
	ts: Date.now(),
	isRunningInit: false,
	searchOptions: {
		showDeprecated: false
	},
	route: 'search',
	filterCategories: {},
	filterTemporal: new FilterTemporal(),
	filterPids:[],
	user: {
		profile: {},
		email: null
	},
	lookup: undefined,
	labelLookup: {},
	specTable: emptyCompositeSpecTable,
	extendedDobjInfo: [],
	formatToRdfGraph: {},
	objectsTable: [],
	sorting: {
		varName: "submTime",
		ascending: false
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
	tabs: {},
	page: 0,
	tsSettings: {},
	helpStorage: new HelpStorage()
};

export type StateSerialized = Omit<State, 'preview'> & {
	preview: PreviewSerialized
}

const update = (state: State, updates: Partial<State>): State => {
	return Object.assign({}, state, updates, {ts: Date.now()});
};

// history state is only automatically updated when URL changes. Use this method to force
// history to store current state.
const updateAndSave = (state: State, updates: any) => {
	const newState = update(state, updates);
	history.replaceState(serialize(newState), '', window.location.href);

	return newState;
};

const serialize = (state: State): StateSerialized => {
	return Object.assign({}, state, {
		filterTemporal: state.filterTemporal.serialize,
		lookup: undefined,
		specTable: state.specTable.serialize,
		paging: state.paging.serialize,
		cart: undefined,
		preview: state.preview.serialize,
		helpStorage: state.helpStorage.serialize
	});
};

const deserialize = (jsonObj: StateSerialized, cart: Cart) => {
	const specTable = CompositeSpecTable.deserialize(jsonObj.specTable);
	const props: State = Object.assign({}, jsonObj, {
		filterTemporal: FilterTemporal.deserialize(jsonObj.filterTemporal as SerializedFilterTemporal),
		lookup: new Lookup(specTable, jsonObj.labelLookup),
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
	return extendUrls(state as State);
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
		preview: state.preview.pids
	});
};

type JsonHashState = {
	route?: Route
	filterCategories?: CategFilters
	filterTemporal?: SerializedFilterTemporal
	tabs?: State['tabs']
	page?: number
	preview?: Sha256Str[]
	id?: UrlStr
}
const jsonToState = (state0: JsonHashState) => {
	const state = {...defaultState, ...state0};

	try {
		if (state0.filterTemporal){
			state.filterTemporal = new FilterTemporal().restore(state0.filterTemporal);
		}
		state.preview = new Preview().withPids(state0.preview ?? []);
		if (state0.id){
			state.id = config.previewIdPrefix[config.envri] + state0.id;
		}
	} catch(err) {
		console.log({state, state0, err});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = (storeState: State) => {
	if (storeState.route === 'search'){
		delete storeState.route;
	}
};

const specialCases = (state: State) => {
	if (state.route === 'metadata') {
		return {
			route: state.route,
			id: state.id,
		};
	} else {
		delete state.id;
		delete state.metadata;
	}

	if (state.route === 'preview') {
		return {
			route: state.route,
			preview: state.preview
		};
	} else {
		delete state.preview;
	}

	if (state.route === 'cart'){
		return {
			route: state.route
		}
	}

	if (state.route === 'search'){
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

const extendUrls = (state: State) => {
	return managePrefixes(state,
		(prefix: CategPrefix, value: string) => {
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

const managePrefixes = (state: State = ({} as State), transform: (pref: CategPrefix, value: string) => string) => {
	if (Object.keys(state).length === 0) return state;
	if (state.filterCategories === undefined || Object.keys(state.filterCategories).length === 0) return state;

	const categories: CategoryType[] = Object.keys(state.filterCategories) as Array<keyof typeof state.filterCategories>;
	const appPrefixes = prefixes[config.envri];
	const fc = state.filterCategories;

	return Object.assign({}, state, {
		filterCategories: categories.reduce<CategFilters>((acc: CategFilters, category: CategoryType) => {
			const filterVals = fc[category]

			if(filterVals) acc[category] = filterVals.map((value: string) => {
				if (Number.isInteger(parseFloat(value))) return value;

				const prefix = appPrefixes[category];
				if (prefix === undefined) return value;

				return transform(prefix, value);
			});

			return acc;
		}, {})
	});
};

const reduceState = (state: KeyAnyVal) => {
	return Object.keys(state).reduce((acc: KeyAnyVal, key: string) => {

		const val = state[key];
		if (!val) return acc;

		if (Array.isArray(val) && val.length){
			acc[key] = val;

		} else if (typeof val === 'object') {
			const part = reduceState(val);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (state.route === 'metadata' && key === 'id' && val && val!.length > 0){
			acc[key] = val!.split('/').pop();

		} else if (typeof val === 'string'){
			acc[key] = val;

		} else if (typeof val === 'number' && val !== 0){
			acc[key] = val;

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
