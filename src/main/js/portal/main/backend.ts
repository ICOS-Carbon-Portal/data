import {sparqlFetch, sparqlFetchAndParse} from './backend/SparqlFetch';
import * as queries from './sparqlQueries';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart, {JsonCart} from './models/Cart';
import Storage from './models/Storage';
import {FilterRequest, isDeprecatedFilter} from './models/FilterRequest';
import {KeyAnyVal, UrlStr, Sha256Str, KeyStrVal} from "./backend/declarations";
import { sparqlParsers } from "./backend/sparql";
import {Options} from "./actions";
import {MetaDataObject, Profile, TsSetting, TsSettings, User, WhoAmI} from "./models/State";
import {throwError} from './utils';
import {
	basicColNames,
	columnMetaColNames,
	originsColNames
} from "./sparqlQueries";
import {ObjInfoQuery} from "./sparqlQueries";
import {Value} from "./models/SpecTable";

const config = Object.assign(commonConfig, localConfig);
const tsSettingsStorageName = 'tsSettings';
const tsSettingsStorage = new Storage();

const extendResult = <C, R>(colNames: C[], rows: R[]) => ({
	colNames,
	rows: rows && rows.length ? rows : [],
	filters: [],
	extraSpecFilter: []
});

const fetchSpecBasics = (filters: FilterRequest[]) => {
	const deprFilter = filters.find(isDeprecatedFilter);
	const query = queries.specBasics(deprFilter);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		type: b.type.value,
		specLabel: b.specLabel.value,
		level: parseInt(b.level.value),
		dataset: b.dataset?.value,
		format: b.format.value,
		formatLabel: b.formatLabel.value,
		theme: b.theme.value,
		themeLabel: b.themeLabel.value,
		temporalResolution: b.temporalResolution?.value
	})).then(rows => extendResult(basicColNames, rows));
};

const fetchSpecColumnMeta = (filters: FilterRequest[]) => {
	const deprFilter = filters.find(isDeprecatedFilter);
	const query = queries.specColumnMeta(deprFilter);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		colTitle: b.colTitle.value,
		valType: b.valType.value,
		valTypeLabel: b.valTypeLabel.value,
		quantityKind: b.quantityKind?.value,
		quantityKindLabel: b.quantityKindLabel.value,
		quantityUnit: b.quantityUnit.value
	})).then(rows => extendResult(columnMetaColNames, rows));
};

export const fetchDobjOriginsAndCounts = (filters: FilterRequest[]) => {
	const query = queries.dobjOriginsAndCounts(filters);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		submitter: b.submitter.value,
		submitterLabel: b.submitterLabel.value,
		project: b.project.value,
		projectLabel: b.projectLabel.value,
		count: parseInt(b.count.value),
		station: b.station?.value,
		stationLabel: b.stationLabel.value
	})).then(rows => extendResult(originsColNames, rows));
};

const fetchFormatToRDFGraphTbl = (): Promise<{[key: string]: UrlStr}> => {
	return fetch(config.metaServer + '/config/dataObjectGraphInfos')
		.then(res => res.json())
		.then(res => (res.reduce((acc: {[key: string]: UrlStr}, row: {format: UrlStr, graph: UrlStr}) => {
				acc[row.format] = row.graph;
				return acc;
			}, {})
		));
};

export function fetchAllSpecTables(filters: FilterRequest[]) {
	const specBasicsPromise = fetchSpecBasics(filters);
	const specColumnMetaPromise = fetchSpecColumnMeta(filters);
	const dobjOriginsAndCountsPromise = fetchDobjOriginsAndCounts(filters);
	const formatToRDFGraphTblPromise = fetchFormatToRDFGraphTbl();

	return Promise.all([specBasicsPromise, specColumnMetaPromise, dobjOriginsAndCountsPromise, formatToRDFGraphTblPromise])
		.then(([basics, columnMeta, origins, formatToRdfGraph]) => (
			{
				specTables: {basics, columnMeta, origins},
				formatToRdfGraph
			}
		));
}

export const fetchKnownDataObjects = (dobjs: string[]) => {
	return fetchAndParseDataObjects(queries.listKnownDataObjects(dobjs));
};

export function fetchFilteredDataObjects(options: Options){
	return fetchAndParseDataObjects(queries.listFilteredDataObjects(options));
}

const fetchAndParseDataObjects = (query: ObjInfoQuery) => {
	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
		dobj: sparqlParsers.fromUrl(b.dobj),
		spec: sparqlParsers.fromUrl(b.spec),
		fileName: sparqlParsers.fromString(b.fileName),
		size: sparqlParsers.fromLong(b.size),
		submTime: sparqlParsers.fromDateTime(b.submTime),
		timeStart: sparqlParsers.fromDateTime(b.timeStart),
		timeEnd: sparqlParsers.fromDateTime(b.timeEnd)
	}));
};

export function searchDobjs(search: string): Promise<{dobj: Sha256Str}[]> {
	const query = queries.findDobjs(search);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		dobj: sparqlParsers.fromUrl(b.dobj).split('/').pop() || throwError(`Expected a data object URL, got ${b.dobj.value}`)
	}));
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

export const getError = (errorId: string): Promise<KeyAnyVal> => {
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

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		dobj: b.dobj.value,
		station: b.station?.value,
		stationId: b.stationId?.value,
		samplingHeight: b.samplingHeight ? parseFloat(b.samplingHeight.value) : undefined,
		theme: b.theme?.value,
		themeIcon: b.themeIcon?.value,
		title: b.title?.value,
		description: b.description?.value,
		columnNames: b.columnNames ? JSON.parse(b.columnNames.value) as string[] : undefined,
		site: b.site?.value,
	}));
};

export const fetchResourceHelpInfo = (uriList: Value[]) => {
	const query = queries.resourceHelpInfo(uriList);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		uri: b.uri.value,
		label: b.label ? b.label.value : undefined,
		comment: b.comment ? b.comment.value : undefined,
		webpage: b.webpage ? b.webpage.value : undefined
	}));
};

export const saveTsSetting = (email: string | null, spec: string, type: string, val: string) => {
	const settings: TsSettings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};
	const setting = settings[spec] || {};
	const newSetting: TsSetting = Object.assign({}, setting, {[type]: val});
	const newSettings: TsSettings = Object.assign({}, settings, {[spec]: newSetting});
	tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

	if (email){
		updatePersonalRestheart(email, {[tsSettingsStorageName]: newSettings});
	}

	return Promise.resolve(newSettings);
};

export const getTsSettings = (email: string | null) => {
	const tsSettings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};

	return email
		? getFromRestheart<KeyStrVal>(email, tsSettingsStorageName).then(settings => {
			const newSettings = settings
				? Object.assign({}, settings[tsSettingsStorageName], tsSettings)
				: tsSettings;
			tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

			return newSettings;
		})
		: Promise.resolve(tsSettings);
};

export const getMetadata = (id: UrlStr): Promise<MetaDataObject> => {
	return fetch(id, {
		headers: new Headers({
			'Accept': 'application/json'
		})
	}).then(resp => {
		return resp.status === 200
			? resp.json()
			: undefined;
	});
};
