import { sparqlFetch, sparqlFetchAndParse } from './backend/SparqlFetch';
import * as queries from './sparqlQueries';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart, {JsonCart} from './models/Cart';
import Storage from './models/Storage';
import {FilterRequest} from './models/FilterRequest';
import {UrlStr, Sha256Str, IdxSig} from "./backend/declarations";
import { sparqlParsers } from "./backend/sparql";
import {Profile, TsSetting, TsSettings, User, WhoAmI} from "./models/State";
import {getLastSegmentInUrl, throwError} from './utils';
import {ObjInfoQuery} from "./sparqlQueries";
import {Filter} from "./models/SpecTable";
import keywordsInfo, { KeywordsInfo } from "./backend/keywordsInfo";
import {QueryParameters} from "./actions/types";
import { SpecTableSerialized } from './models/CompositeSpecTable';
import { References } from '../../common/main/metacore';

const config = Object.assign(commonConfig, localConfig);
const tsSettingsStorageName = 'tsSettings';
const tsSettingsStorage = new Storage();

const fetchSpecBasics = () => {
	const query = queries.specBasics();

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		type: b.type.value,
		level: parseInt(b.level.value),
		dataset: b.dataset?.value,
		format: b.format.value,
		theme: b.theme.value,
		temporalResolution: b.temporalResolution?.value
	}));
};

const fetchSpecColumnMeta = () => {
	const query = queries.specColumnMeta();

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		variable: b.variable.value,
		varTitle: b.varTitle.value,
		valType: b.valType.value,
		quantityKind: sparqlParsers.fromUrl(b.quantityKind),
		quantityUnit: b.quantityUnit.value
	}));
};

export const fetchDobjOriginsAndCounts = (filters: FilterRequest[]) => {
	const query = queries.dobjOriginsAndCounts(filters);

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		submitter: b.submitter.value,
		project: b.project.value,
		count: parseInt(b.count.value),
		station: b.station?.value,
		site: b.site?.value,
		ecosystem: b.ecosystem?.value,
		location: b.location?.value
	}));
};

export const fetchStationPositions = () => {
	const query = queries.stationPositions();

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		station: b.station.value,
		lon: parseFloat(b.lon.value),
		lat: parseFloat(b.lat.value)
	}));
};

// export const fetchStationPositions = (pointTransformer: TransformPointFn) => {
// 	const query = queries.stationPositions();

// 	return sparqlFetchAndParseCustom(query, config.sparqlEndpoint, b => ({
// 		coord: pointTransformer(parseFloat(b.lon.value), parseFloat(b.lat.value)),
// 		attributes: {
// 			stationUri: b.station.value
// 		}
// 	}));
// };

type LabelLookup = {uri: UrlStr, label: string}[]

export function fetchLabelLookup(): Promise<LabelLookup> {
	const query = queries.labelLookup();

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		uri: b.uri.value,
		label: b.label.value,
		stationId: b.stationId?.value
	})).then(ll => ll.rows.map(item => ({
		uri: item.uri,
		label: item.stationId ? `(${item.stationId}) ${item.label}` : item.label
	})));
}

export type BootstrapData = {
	specTables: SpecTableSerialized
	labelLookup: LabelLookup
	keywords: KeywordsInfo
}

export function fetchBoostrapData(filters: FilterRequest[]): Promise<BootstrapData> {

	// Do not ask more than 5 question in parallel
	return Promise.all([
		fetchSpecBasics(),
		fetchSpecColumnMeta(),
		fetchDobjOriginsAndCounts(filters),
		fetchLabelLookup(),
		keywordsInfo.fetch()
	]).then(
		([basics, columnMeta, origins, labelLookup, keywords]) => ({
			specTables: { basics, columnMeta, origins },
			labelLookup,
			keywords
		})
	)
}

export const fetchKnownDataObjects = (dobjs: string[]) => {
	return fetchAndParseDataObjects(queries.listKnownDataObjects(dobjs));
};

export function fetchFilteredDataObjects(options: QueryParameters){
	return Filter.allowsNothing(options.specs) || Filter.allowsNothing(options.submitters) || Filter.allowsNothing(options.stations)
		? Promise.resolve({
			colNames: [],
			rows: []
		})
		: fetchAndParseDataObjects(queries.listFilteredDataObjects(options));
}

const fetchAndParseDataObjects = (query: ObjInfoQuery) => {
	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		dobj: sparqlParsers.fromUrl(b.dobj),
		spec: sparqlParsers.fromUrl(b.spec),
		fileName: sparqlParsers.fromString(b.fileName),
		size: sparqlParsers.fromLong(b.size),
		submTime: sparqlParsers.fromDateTime(b.submTime),
		timeStart: sparqlParsers.fromDateTime(b.timeStart),
		timeEnd: sparqlParsers.fromDateTime(b.timeEnd),
		hasVarInfo: sparqlParsers.fromBoolean(b.hasVarInfo)
	}));
};

export function sparqlFetchBlob(queryTxt: string, acceptCachedResults: boolean = true) {
	return sparqlFetch(queryTxt, config.sparqlEndpoint, 'CSV', acceptCachedResults)
		.then(resp => resp.blob());
}

export function searchDobjs(search: string): Promise<{dobj: Sha256Str}[]> {
	const query = queries.findDobjs(search);

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		dobj: getLastSegmentInUrl(sparqlParsers.fromUrl(b.dobj)) || throwError(`Expected a data object URL, got ${b.dobj.value}`)
	})).then(res => res.rows);
}

export const saveCart = (email: string | null, cart: Cart): Promise<void> => {
	if (email){
		updatePersonalRestheart(email, {cart});
	}
	return Promise.resolve(sessionStorage.setItem('cp-cart', JSON.stringify(cart)));
};

const updatePersonalRestheart = (email: string, data: {}): void => {
	fetch(`${config.restheartProfileBaseUrl}/${email}`, {
		credentials: 'include',
		method: 'PATCH',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(data)
	});
};

export const getError = (errorId: string): Promise<IdxSig<any>> => {
	return fetch(`${config.portalUseLogUrl}/${errorId}`).then(resp => {
		return resp.status === 200
			? Promise.resolve(resp.json())
			: Promise.resolve(undefined);
	});
};

export const logOut = (): Promise<boolean> => {
	return fetch('/logout', {credentials: 'include'}).then(resp => {
		return resp.status === 200
			? Promise.resolve(true)
			: Promise.reject(false);
	});
};

export const getCart = (email: string | null) => {
	const sessionStorageCart = sessionStorage.getItem('cp-cart');
	const sessionStorageJson: JsonCart = sessionStorageCart
		? JSON.parse(sessionStorageCart)
		: new Cart().serialize;
	const cartInSessionStorage = {cart: sessionStorageJson};
	const cartInRestheart = email
		? getFromRestheart<{cart: JsonCart}>(email, 'cart')
		: Promise.resolve({cart: new Cart().serialize});

	return Promise.resolve({cartInSessionStorage, cartInRestheart});
};

const getFromRestheart = <T>(email: string, key: string): Promise<T> => {
	return fetch(`${config.restheartProfileBaseUrl}/${email}?keys={${key}:1}`, {credentials: 'include'})
		.then(resp => {
			return resp.status === 200
				? resp.json() as unknown as T
				: {} as T;
		});
};

export const getIsBatchDownloadOk = (): Promise<boolean> => {
	return fetch('../objects?ids=[]&fileName=test', {credentials: 'include'})
		.then(response => response.status === 200);
};

export function getWhoIam(){
	return fetch('/whoami', {credentials: 'include'})
		.then(resp => {
			return resp.status === 200
				? resp.json() as unknown as WhoAmI
				: {email: null};
		});
}

export const getProfile = (email: string | null): Promise<User['profile']> => {
	return email
		? getFromRestheart<Profile>(email, 'profile')
		: Promise.resolve({});
};

export const getExtendedDataObjInfo = (dobjs: UrlStr[]) => {
	if (dobjs.length == 0) return Promise.resolve([]);

	const query = queries.extendedDataObjectInfo(dobjs);

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		dobj: sparqlParsers.fromUrl(b.dobj),
		station: sparqlParsers.fromString(b.station),
		stationId: sparqlParsers.fromString(b.stationId),
		samplingHeight: sparqlParsers.fromFloat(b.samplingHeight),
		theme: sparqlParsers.fromString(b.theme),
		themeIcon: sparqlParsers.fromString(b.themeIcon),
		title: sparqlParsers.fromString(b.title),
		description: sparqlParsers.fromString(b.description),
		columnNames: b.columnNames ? JSON.parse(b.columnNames.value) as string[] : undefined,
		site: b.site?.value,
		hasVarInfo: sparqlParsers.fromBoolean(b.hasVarInfo),
		biblioInfo: sparqlParsers.fromString(b.biblioInfo)
	})).then(res => res.rows.map(
		({biblioInfo, ...row}) => ({
			...row,
			biblioInfo: biblioInfo ? JSON.parse(biblioInfo) as References : undefined
		})
	));
};

export const fetchResourceHelpInfo = (uriList: UrlStr[]) => {
	const query = queries.resourceHelpInfo(uriList);

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		uri: sparqlParsers.fromUrl(b.uri),
		label: sparqlParsers.fromString(b.label),
		comment: sparqlParsers.fromString(b.comment),
		webpage: sparqlParsers.fromUrl(b.webpage)
	})).then(res => res.rows);
};

export const saveTsSetting = (email: string | null, spec: string, type: string, val: string) => {
	const settings: TsSettings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};
	const setting = settings[spec] || {} as TsSetting;
	const newSetting: TsSetting = { ...setting, ...{ [type]: val } };
	const newSettings: TsSettings = { ...settings, ...{ [spec]: newSetting } };
	tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

	if (email){
		updatePersonalRestheart(email, {[tsSettingsStorageName]: newSettings});
	}

	return Promise.resolve(newSettings);
};

export const getTsSettings = (email: string | null) => {
	const tsSettings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};

	return email
		? getFromRestheart<IdxSig>(email, tsSettingsStorageName).then(settings => {
			const newSettings = settings
				? Object.assign({}, settings[tsSettingsStorageName], tsSettings)
				: tsSettings;
			tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

			return newSettings;
		})
		: Promise.resolve(tsSettings);
};

export const fetchJson = <T>(url: UrlStr, method: string = 'GET'): Promise<T> => {
	return fetch(url, {
		method,
		mode: 'cors',
		headers: new Headers({
			'Accept': 'application/json'
		})
	}).then(resp => {
		return resp.status === 200
			? resp.json()
			: undefined;
	});
};
