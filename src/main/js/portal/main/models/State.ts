import Preview, {type PreviewSettings} from "./Preview";
import FilterTemporal, {type SerializedFilterTemporal} from "./FilterTemporal";
import CompositeSpecTable, {type BasicsColNames, type VariableMetaColNames, type OriginsColNames} from "./CompositeSpecTable";
import PreviewLookup from "./PreviewLookup";
import Cart from "./Cart";
import Paging from "./Paging";
import HelpStorage, {type HelpStorageListEntry} from './HelpStorage';
import config, {
	prefixes,
	type CategoryType,
	type CategPrefix,
	numberFilterKeys
} from "../config";
import deepequal from 'deep-equal';
import {type UrlStr, type Sha256Str} from "../backend/declarations";
import {type Store} from "redux";
import {type DataObject, type References} from "../../../common/main/metacore";
import SpecTable from "./SpecTable";
import {getLastSegmentInUrl, pick} from "../utils";
import {FilterNumber, FilterNumbers, type FilterNumberSerialized} from "./FilterNumbers";
import {type SupportedSRIDs} from "icos-cp-ol";
import PortalHistoryState from "../backend/PortalHistoryState";


export const portalHistoryState = new PortalHistoryState(config.portalHistoryStateProps);

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
	'preview',
	'previewSettings',
	'id',
	'yAxis',
	'y2Axis',
	'searchOptions',
	'mapProps',
	'itemsToAddToCart'
];

export type Route = 'search' | 'metadata' | 'preview' | 'cart';

export type Profile = {
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
};

export type WhoAmI = {
	email: string | null
};
export type User = {
	profile: Profile | {}
} & WhoAmI;

export type KnownDataObject = {
	dobj: string
	hasNextVersion: boolean
	hasVarInfo?: boolean
	dataset: string
	fileName: string
	format: string
	formatLabel?: string
	level: number
	size: string
	spec: string
	specLabel?: string
	submTime: Date
	theme: string
	themeLabel?: string
	timeEnd: Date
	timeStart: Date
	type?: string // this is currently always the same as spec, but maybe was supposed to be PreviewType at some point
	temporalResolution?: string
	extendedDobjInfo?: ExtendedDobjInfo
};

export type ExtendedDobjInfo = {
	dobj: UrlStr
	station: string | undefined
	stationId: string | undefined
	samplingHeight: number | undefined
	samplingPoint: string | undefined
	theme: string | undefined
	themeIcon: string | undefined
	title: string | undefined
	description: string | undefined
	specComments: string | undefined
	columnNames: string[] | undefined
	site: string | undefined
	hasVarInfo: boolean | undefined
	dois: UrlStr[] | undefined
	biblioInfo: References | undefined
};

export type MetaData = {
	id: UrlStr
} & DataObject;

export type MetaDataWStats = {
	downloadCount: number
	previewCount: number
} & MetaData;

export type SearchOptions = {
	showDeprecated: boolean
};

export type TabsState = {
	tabName?: string
	selectedTabId?: string
	searchTab?: number
	resultTab?: number
};

// TODO Investigate whether the type should be Filter, and whether Value needs to have 'number' on the list of types
export type CategFilters = Partial<Record<CategoryType, string[] | null>>;

export type TsSetting = {x: string} & {y: string} & {y2: string} & {type: 'line' | 'scatter'};
export type TsSettings = Record<string, TsSetting>;

export type ExportQuery = {
	isFetchingCVS: boolean
	sparqClientQuery: string
};

export type StationPos4326Lookup = Record<UrlStr, {lon: number, lat: number}>;
export type LabelLookup = Record<string, {label: string, list: HelpStorageListEntry[]}>;

// 0=lower left X (lon), 1=lower left Y (lat), 2=upper right X (lon), 3=upper right Y (lat)
export type DrawRectBbox = [number, number, number, number];
export type MapProps = {
	srid: SupportedSRIDs
	rects?: DrawRectBbox[]
};

export type State = {
	ts: number | undefined
	isRunningInit: boolean
	searchOptions: SearchOptions
	route: Route | undefined
	countryCodesLookup: Record<string, string>
	filterCategories: CategFilters
	filterTemporal: FilterTemporal
	filterPids: Sha256Str[] | null
	filterNumbers: FilterNumbers
	filterFileName: string
	user: User
	previewLookup: PreviewLookup | undefined
	labelLookup: LabelLookup
	stationPos4326Lookup: StationPos4326Lookup
	specTable: CompositeSpecTable
	baseDobjStats: SpecTable<OriginsColNames> // without spatial filtering
	mapProps: MapProps
	extendedDobjInfo: ExtendedDobjInfo[]
	formatToRdfGraph: {}
	objectsTable: KnownDataObject[]
	sorting: {
		varName: string
		ascending: boolean
	}
	paging: Paging
	cart: Cart
	priorCart: Cart | undefined
	id: UrlStr | undefined
	metadata?: MetaData | MetaDataWStats
	station: {} | undefined
	preview: Preview
	previewSettings: PreviewSettings
	itemsToAddToCart: Sha256Str[] | undefined
	toasterData: {} | undefined
	batchDownloadStatus: {
		isAllowed: boolean
		ts: number
	}
	checkedObjectsInSearch: UrlStr[]
	checkedObjectsInCart: UrlStr[]
	tabs: TabsState
	page: number
	tsSettings: TsSettings
	helpStorage: HelpStorage
	scopedKeywords: string[]
	filterKeywords: string[]
	exportQuery: ExportQuery
};

export const emptyCompositeSpecTable = new CompositeSpecTable(
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
	route: undefined,
	countryCodesLookup: {},
	filterCategories: {},
	filterTemporal: new FilterTemporal(),
	filterPids: null,
	filterNumbers: new FilterNumbers(numberFilterKeys.map(cat => new FilterNumber(cat))),
	filterFileName: "",
	user: {
		profile: {},
		email: null
	},
	previewLookup: undefined,
	labelLookup: {},
	stationPos4326Lookup: {},
	specTable: emptyCompositeSpecTable,
	baseDobjStats: new SpecTable<OriginsColNames>([], [], {}),
	mapProps: {
		srid: config.olMapSettings.defaultSRID,
		rects: []
	},
	extendedDobjInfo: [],
	formatToRdfGraph: {},
	objectsTable: [],
	sorting: {
		varName: "submTime",
		ascending: false
	},
	paging: new Paging({objCount: 0}),
	cart: new Cart(),
	priorCart: undefined,
	id: undefined,
	metadata: undefined,
	station: undefined,
	preview: new Preview(),
	previewSettings: {},
	itemsToAddToCart: undefined,
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
	scopedKeywords: [],
	filterKeywords: [],
	exportQuery: {
		isFetchingCVS: false,
		sparqClientQuery: ''
	}
};

const update = (state: State, updates: Partial<State>): State => ({...state, ...updates, ts: Date.now()});

// history state is only automatically updated when URL changes. Use this method to force
// history to store current state.
const updateAndSave = (state: State, updates: any) => {
	const newState = update(state, updates);

	portalHistoryState.replaceState(serialize(newState), globalThis.location.href).catch(error => console.error(`Failed to add value to indexed database because ${error}`)).then(
		_ => _
	);

	return newState;
};

const serialize = (state: State) => ({
	...state,
	filterTemporal: state.filterTemporal.serialize,
	filterNumbers: state.filterNumbers.serialize,
	specTable: state.specTable.serialize,
	baseDobjStats: state.baseDobjStats.serialize,
	paging: state.paging.serialize,
	cart: undefined,
	priorCart: undefined,
	preview: state.preview.serialize,
	helpStorage: state.helpStorage.serialize
});

export type StateSerialized = ReturnType<typeof serialize>;

const deserialize = (jsonObj: StateSerialized, cart: Cart) => {
	const specTable = CompositeSpecTable.deserialize(jsonObj.specTable);

	const {table, varInfo} = jsonObj.previewLookup ?? {};
	const previewLookup = table && varInfo
		? new PreviewLookup(table, varInfo)
		: PreviewLookup.init(specTable, jsonObj.labelLookup);
	const baseDobjStats = SpecTable.deserialize(jsonObj.baseDobjStats);
	const preview = Preview.deserialize(jsonObj.preview);

	const props: State = {
		...jsonObj,
		filterTemporal: FilterTemporal.deserialize(jsonObj.filterTemporal),
		filterNumbers: FilterNumbers.deserialize(jsonObj.filterNumbers),
		previewLookup,
		specTable,
		baseDobjStats,
		paging: Paging.deserialize(jsonObj.paging),
		cart,
		preview,
		previewSettings: preview.previewSettings,
		helpStorage: HelpStorage.deserialize(jsonObj.helpStorage),
		exportQuery: {isFetchingCVS: false, sparqClientQuery: jsonObj.exportQuery.sparqClientQuery}
	};

	return props;
};

// Hash to state and state to hash below
const getStateFromHash = () => {
	const state = jsonToState(parseHash(getCurrentHash()));
	return extendUrls(state as State) as State;
};

// No # in the beginning!
const parseHash = (hash: string) => {
	try {
		return allowlistJsonHash(JSON.parse(hash));
	} catch {
		return {};
	}
};

const hashToState = () => {
	try {
		return JSON.parse(getCurrentHash());
	} catch {
		return {};
	}
};

const getStateFromStore = (storeState: State & Record<string, any>) => hashKeys.reduce((acc: Record<string, any>, key: string) => {
	acc[key] = storeState[key];
	return acc;
}, {});

const simplifyState = (state: State) => Object.assign(state, {
	filterTemporal: state.filterTemporal ? state.filterTemporal.serialize : {},
	filterNumbers: state.filterNumbers.serialize,
	preview: state.preview.pids
});

type JsonHashState = {
	route?: Route
	filterCategories?: CategFilters
	filterTemporal?: SerializedFilterTemporal
	filterPids?: Sha256Str
	filterNumbers?: FilterNumberSerialized[]
	filterKeywords?: string[]
	tabs?: State['tabs']
	page?: number
	preview?: Sha256Str[]
	previewSettings?: PreviewSettings
	id?: UrlStr
	yAxis?: string
	y2Axis?: string
	searchOptions?: SearchOptions
	mapProps?: MapProps
	itemsToAddToCart?: Sha256Str[]
};

const allowlistJsonHash = (hash: any): JsonHashState => {
	const allowedHash: JsonHashState = {};
	const ps: PreviewSettings = {};

	for (const key in hash) {
		if (key === "yAxis") {
			ps.y = hash[key];
		} else if (key === "y2Axis") {
			ps.y2 = hash[key];
		} else if (hashKeys.includes(key)) {
			allowedHash[key as keyof JsonHashState] = hash[key];
		}
	}
	allowedHash.previewSettings = (allowedHash.previewSettings
		? {...Preview.allowlistPreviewSettings(allowedHash.previewSettings), ...ps}
		: ps);

	return allowedHash;
};

const jsonToState = (state0: JsonHashState) => {
	const state = {...defaultState, ...state0};

	try {
		if (state0.filterTemporal) {
			state.filterTemporal = new FilterTemporal().restore(state0.filterTemporal);
		}
		if (state0.filterNumbers) {
			state.filterNumbers = defaultState.filterNumbers.restore(state0.filterNumbers);
		}

		state.preview = new Preview().withPids(state0.preview ?? [], state0.previewSettings ?? {});

		if (state0.id) {
			state.id = config.objectUriPrefix[config.envri] + state0.id;
		}
	} catch (error) {
		console.error({state, state0, err: error});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = (storeState: Partial<StateSerialized>) => {
	if (storeState.route === 'search') {
		delete storeState.route;
	}
};

const specialCases = (state: Partial<StateSerialized>) => {
	if (state.route === 'preview') {
		return {
			route: state.route,
			preview: state.preview,
			previewSettings: state.previewSettings,
			itemsToAddToCart: state.itemsToAddToCart
		};
	}
	delete state.preview;
	delete state.previewSettings;


	if (state.route === 'cart') {
		return {
			route: state.route
		};
	}

	if (state.route === 'search') {
		delete state.route;
	}

	return state;
};

function getCurrentHash() {
	return decodeURIComponent(globalThis.location.hash.slice(1));
}

const hashUpdater = (store: Store) => () => {
	const state: State = store.getState();
	let newHash = stateToHash(state);
	const oldHash = getCurrentHash();


	if (newHash !== oldHash) {
		newHash = newHash === '' ? '' : "#" + encodeURIComponent(newHash);
		if (state.route === hashToState().route) {
			portalHistoryState.replaceState(serialize(state), globalThis.location.href.split('#')[0] + newHash).catch(error => console.log(`Failed to add value to indexed database because ${error}`)).then(
				_ => _
			);
		} else {
			portalHistoryState.pushState(serialize(state), globalThis.location.href.split('#')[0] + newHash).catch(error => console.log(`Failed to add value to indexed database because ${error}`)).then(
				_ => _
			);
		}
	}
};

const storeOverwatch = (store: Store, stateKeys: (keyof State)[], onChange: Function) => {
	let currentState: State;

	const handleChange = () => {
		const nextState = pick(store.getState(), ...stateKeys);
		currentState ??= nextState;

		const changes = stateKeys.reduce<Partial<typeof nextState>>((acc, key) => {
			if (!deepequal(currentState[key], nextState[key])) {
				acc[key] = nextState[key];
			}
			return acc;
		}, {});

		if (Object.keys(changes).length > 0) {
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
	return Object.keys(final).length > 0 ? JSON.stringify(final) : '';
};

const shortenUrls = (state: Partial<StateSerialized> = ({} as Partial<StateSerialized>)) => managePrefixes(state,
	(prefix: any, value: string) => {
		if (Array.isArray(prefix)) {
			// TODO: remove prefix handling since wdcgg is no longer present
			const prefixObj = prefix.find(p => value.startsWith(p.value) || p.prefix === 'i');
			if (prefixObj === undefined) {
				throw new Error(`Could not find prefix for ${value}`);
			}
			return prefixObj.prefix + value.slice(prefixObj.value.length);
		}
		return value.slice(prefix.length);
	});

const extendUrls = (state: State) => managePrefixes(state,
	(prefix: CategPrefix, value: string) => {
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return value;
		}
		if (Array.isArray(prefix)) {
			const pLetter = value.slice(0, 1);
			const prefixObj = prefix.find(p => p.prefix === pLetter);

			if (prefixObj === undefined) {
				throw new Error(`Could not find prefix for ${value}`);
			}
			return prefixObj.value + value.slice(1);
		}
		return prefix + value;
	});

const managePrefixes = (state: State | Partial<StateSerialized> = ({} as Partial<StateSerialized>), transform: (pref: CategPrefix, value: string) => string) => {
	if (Object.keys(state).length === 0) {
		return state;
	}
	if (state.filterCategories === undefined || Object.keys(state.filterCategories).length === 0) {
		return state;
	}

	const categories: CategoryType[] = Object.keys(state.filterCategories) as Array<keyof typeof state.filterCategories>;
	const appPrefixes = prefixes[config.envri];
	const fc = state.filterCategories;

	return {
		...state,
		filterCategories: categories.reduce<CategFilters>((acc: CategFilters, category: CategoryType) => {
			const filterVals = fc[category];

			if (filterVals) {
				acc[category] = filterVals.map((value: string) => {
					if (appPrefixes[category]) {
						const prefix = appPrefixes[category];
						if (prefix === undefined) {
							return value;
						}

						return transform(prefix, value);
					}
					return value;
				});
			}

			return acc;
		}, {})

	};
};

const reduceState = (state: Record<string, any>) => Object.keys(state).reduce((acc: Record<string, any>, key: string) => {
	const val = state[key];
	if (val === null) {
		return acc;
	}

	if (key === 'mapProps') {
		if ((val as MapProps).rects?.length) {
			acc[key] = val;
		}
	} else if (Array.isArray(val) && val.length > 0) {
		acc[key] = val;
	} else if (typeof val === 'object') {
		const part = reduceState(val);

		if (Object.keys(part).length > 0) {
			acc[key] = part;
		}
	} else if (state.route === 'metadata' && key === 'id' && val && val.length > 0) {
		acc[key] = getLastSegmentInUrl(val);
	} else if (typeof val === 'string') {
		acc[key] = val;
	} else if (typeof val === 'number' && val !== 0) {
		acc[key] = val;
	} else if (key === 'showDeprecated' && val) {
		acc[key] = val;
	}

	return acc;
}, {});

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
