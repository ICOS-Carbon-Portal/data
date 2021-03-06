import Preview from "./Preview";
import FilterTemporal, {SerializedFilterTemporal} from "./FilterTemporal";
import CompositeSpecTable, {BasicsColNames, VariableMetaColNames, OriginsColNames} from "./CompositeSpecTable";
import PreviewLookup from "./PreviewLookup";
import Cart from "./Cart";
import Paging from "./Paging";
import HelpStorage from './HelpStorage';
import config, {
	prefixes,
	CategoryType,
	CategPrefix,
	numberFilterKeys
} from "../config";
import deepequal from 'deep-equal';
import {AsyncResult, UrlStr, Sha256Str, IdxSig} from "../backend/declarations";
import {Store} from "redux";
import {fetchKnownDataObjects, getExtendedDataObjInfo} from "../backend";
import {DataObject} from "./CartItem";
import {DataObject as DO} from "../../../common/main/metacore";
import SpecTable, {Row} from "./SpecTable";
import {getLastSegmentInUrl, pick} from "../utils";
import {FilterNumber, FilterNumbers, FilterNumberSerialized} from "./FilterNumbers";
import { KeywordsInfo } from "../backend/keywordsInfo";


// hashKeys objects are automatically represented in the URL hash (with some special cases).
// Changes to any of these objects are automatically saved in browser history state
// If other objects needs to be saved in browser history, use method 'updateAndSave'
const hashKeys = [
	'route',
	'filterCategories',
	'filterTemporal',
	'filterPids',
	'filterNumbers',
	'filterKeywords',
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

type KnownDataObject = AsyncResult<typeof fetchKnownDataObjects>['rows'][0]
export type ExtendedDobjInfo = AsyncResult<typeof getExtendedDataObjInfo>[0]
export type ObjectsTable = KnownDataObject & ExtendedDobjInfo & DataObject & Row<BasicsColNames>;

export interface MetaDataObject extends DO{
	coverageGeo: object
}
export interface MetaData extends MetaDataObject {
	id: UrlStr
}

export interface MetaDataWStats extends MetaData {
	downloadCount: number,
	previewCount: number
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

export type ExportQuery = {
	isFetchingCVS: boolean
	sparqClientQuery: string
}
export interface State {
	ts: number | undefined
	isRunningInit: boolean
	searchOptions: SearchOptions
	route: Route
	filterCategories: CategFilters
	filterTemporal: FilterTemporal
	filterPids: Sha256Str[]
	filterNumbers: FilterNumbers
	user: User
	previewLookup: PreviewLookup | undefined;
	labelLookup: IdxSig;
	specTable: CompositeSpecTable
	extendedDobjInfo: ExtendedDobjInfo[]
	formatToRdfGraph: {}
	objectsTable: ObjectsTable[]
	sorting: {
		varName: string,
		ascending: boolean
	}
	paging: Paging
	cart: Cart
	id: UrlStr | undefined;
	metadata?: MetaData | MetaDataWStats
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
	keywords: KeywordsInfo
	filterKeywords: string[]
	exportQuery: ExportQuery
}

const emptyCompositeSpecTable = new CompositeSpecTable(
	new SpecTable<BasicsColNames>([], [], {}),
	new SpecTable<VariableMetaColNames>([], [], {}),
	new SpecTable<OriginsColNames>([], [], {})
);

export const defaultState: State = {
	ts: Date.now(),
	isRunningInit: true,
	searchOptions: {
		showDeprecated: false
	},
	route: 'search',
	filterCategories: {},
	filterTemporal: new FilterTemporal(),
	filterPids:[],
	filterNumbers: new FilterNumbers(numberFilterKeys.map(cat => new FilterNumber(cat))),
	user: {
		profile: {},
		email: null
	},
	previewLookup: undefined,
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
	helpStorage: new HelpStorage(),
	keywords: {specLookup: {}, dobjKeywords: []},
	filterKeywords: [],
	exportQuery: {
		isFetchingCVS: false,
		sparqClientQuery: ''
	}
};

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

const serialize = (state: State) => {
	return {...state,
		filterTemporal: state.filterTemporal.serialize,
		filterNumbers: state.filterNumbers.serialize,
		lookup: undefined,
		specTable: state.specTable.serialize,
		paging: state.paging.serialize,
		cart: undefined,
		preview: state.preview.serialize,
		helpStorage: state.helpStorage.serialize
	};
};

export type StateSerialized = ReturnType<typeof serialize>

const deserialize = (jsonObj: StateSerialized, cart: Cart) => {
	const specTable = CompositeSpecTable.deserialize(jsonObj.specTable);

	const { table, varInfo } = jsonObj.previewLookup ?? {};
	const previewLookup = table && varInfo
		? new PreviewLookup(undefined, undefined, table, varInfo)
		: new PreviewLookup(specTable, jsonObj.labelLookup);

	const props: State = {...jsonObj,
		filterTemporal: FilterTemporal.deserialize(jsonObj.filterTemporal as SerializedFilterTemporal),
		filterNumbers: FilterNumbers.deserialize(jsonObj.filterNumbers as FilterNumberSerialized[]),
		previewLookup,
		specTable,
		paging: Paging.deserialize(jsonObj.paging),
		cart,
		preview: Preview.deserialize(jsonObj.preview),
		helpStorage: HelpStorage.deserialize(jsonObj.helpStorage),
		exportQuery: {isFetchingCVS: false, sparqClientQuery: jsonObj.exportQuery.sparqClientQuery}
	};

	return props;
};

// Hash to state and state to hash below
const getStateFromHash = (hash?: string) => {
	const state = hash === undefined
		? jsonToState(parseHash(getCurrentHash()))
		: jsonToState(parseHash(decodeURIComponent(hash)));
	return extendUrls(state as State) as State;
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

const getStateFromStore = (storeState: State & IdxSig<any>) => {
	return hashKeys.reduce((acc: IdxSig<any>, key: string) => {
		acc[key] = storeState[key];
		return acc;
	}, {});
};

const simplifyState = (state: State) => {
	return Object.assign(state, {
		filterTemporal: state.filterTemporal ? state.filterTemporal.serialize : {},
		filterNumbers: state.filterNumbers.serialize,
		preview: state.preview.pids
	});
};

type JsonHashState = {
	route?: Route
	filterCategories?: CategFilters
	filterTemporal?: SerializedFilterTemporal
	filterNumbers?: FilterNumberSerialized[]
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
		if (state0.filterNumbers){
			state.filterNumbers = defaultState.filterNumbers.restore(state0.filterNumbers);
		}
		state.preview = new Preview().withPids(state0.preview ?? []);
		if (state0.id){
			state.id = config.objectUriPrefix[config.envri] + state0.id;
		}
	} catch(err) {
		console.log({state, state0, err});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = (storeState: Partial<StateSerialized>) => {
	if (storeState.route === 'search'){
		delete storeState.route;
	}
};

const specialCases = (state: Partial<StateSerialized>) => {
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

const storeOverwatch = (store: Store, stateKeys: (keyof State)[], onChange: Function) => {
	let currentState: State;

	const handleChange = () => {
		const nextState = pick(store.getState(), ...stateKeys);
		if (currentState === undefined)
			currentState = nextState;
		
		const changes = stateKeys.reduce<Partial<typeof nextState>>((acc, key) => {
			if (!deepequal(currentState[key], nextState[key]))
				acc[key] = nextState[key];
			return acc;
		}, {});

		if (Object.keys(changes).length) {
			onChange(currentState, nextState, changes, (state: State) => pick(state, ...stateKeys));
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
	handleRoute(reducedStoreState as Partial<StateSerialized>);
	const withSpecialCases = specialCases(reducedStoreState as Partial<StateSerialized>);
	const final = shortenUrls(withSpecialCases);

	return Object.keys(final).length ? JSON.stringify(final) : '';
};

const shortenUrls = (state: Partial<StateSerialized> = ({} as Partial<StateSerialized>)) => {
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

const managePrefixes = (state: State | Partial<StateSerialized> = ({} as Partial<StateSerialized>), transform: (pref: CategPrefix, value: string) => string) => {
	if (Object.keys(state).length === 0) return state;
	if (state.filterCategories === undefined || Object.keys(state.filterCategories).length === 0) return state;

	const categories: CategoryType[] = Object.keys(state.filterCategories) as Array<keyof typeof state.filterCategories>;
	const appPrefixes = prefixes[config.envri];
	const fc = state.filterCategories;

	return {
		...state, ...{
			filterCategories: categories.reduce<CategFilters>((acc: CategFilters, category: CategoryType) => {
				const filterVals = fc[category];

				if (filterVals) acc[category] = filterVals.map((value: string) => {
					if (appPrefixes[category]) {
						const prefix = appPrefixes[category];
						if (prefix === undefined) return value;

						return transform(prefix, value);
					} else {
						return value;
					}
				});

				return acc;
			}, {})
		}
	};
};

const reduceState = (state: IdxSig<any>) => {
	return Object.keys(state).reduce((acc: IdxSig<any>, key: string) => {

		const val = state[key];
		if (!val) return acc;

		if (Array.isArray(val) && val.length){
			acc[key] = val;

		} else if (typeof val === 'object') {
			const part = reduceState(val);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (state.route === 'metadata' && key === 'id' && val && val.length > 0){
			acc[key] = getLastSegmentInUrl(val);

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
