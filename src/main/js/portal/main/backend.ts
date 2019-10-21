import {sparqlFetch, sparqlFetchAndParse} from './backend/SparqlFetch';
import * as queries from './sparqlQueries';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart, {JsonCart} from './models/Cart';
import Storage from './models/Storage';
import 'whatwg-fetch';
import {KeyAnyVal, UrlStr} from "./backend/declarations";
import {DataObject} from "../../common/main/metacore";
import {SparqlResultBinding, SparqlResultValue} from "./backend/sparql";

const config = Object.assign(commonConfig, localConfig);
const tsSettingsStorageName = 'tsSettings';
const tsSettingsStorage = new Storage();

const fetchSpecBasics = () => {
	const query = queries.specBasics();

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		type: b.type.value,
		specLabel: b.specLabel.value,
		level: b.level.value,
		dataset: b.dataset ? b.dataset.value : undefined,
		format: b.format.value,
		formatLabel: b.formatLabel.value,
		theme: b.theme.value,
		themeLabel: b.themeLabel.value
	}));
};

const fetchSpecColumnMeta = () => {
	const query = queries.specColumnMeta();

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		colTitle: b.colTitle.value,
		valType: b.valType.value,
		valTypeLabel: b.valTypeLabel.value,
		quantityKind: b.quantityKind ? b.quantityKind.value : undefined,
		quantityKindLabel: b.quantityKindLabel.value,
		quantityUnit: b.quantityUnit.value
	}));
};

const fetchDobjOriginsAndCounts = () => {
	const query = queries.dobjOriginsAndCounts();

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		spec: b.spec.value,
		submitter: b.submitter.value,
		submitterLabel: b.submitterLabel.value,
		project: b.project.value,
		projectLabel: b.projectLabel.value,
		count: parseInt(b.count.value),
		station: b.station ? b.station.value : undefined,
		stationLabel: b.stationLabel.value
	}));
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

export function fetchAllSpecTables() {
	const extendResult = <T>(rows: T[]) => ({
		columnNames: rows && rows.length ? Object.keys(rows[0]) : [],
		rows: rows && rows.length ? rows : []
	});

	const specBasicsPromise = fetchSpecBasics().then(rows => extendResult(rows));
	const specColumnMetaPromise = fetchSpecColumnMeta().then(rows => extendResult(rows));
	const dobjOriginsAndCountsPromise = fetchDobjOriginsAndCounts().then(rows => extendResult(rows));
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
	const query = queries.listKnownDataObjects(dobjs);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		dobj: b.dobj.value,
		spec: b.spec.value,
		fileName: b.fileName.value,
		size: b.size.value,
		submTime: b.submTime.value,
		timeStart: b.timeStart.value,
		timeEnd: b.timeEnd.value
	}));
};

export function fetchFilteredDataObjects(options: {}){
	const query = queries.listFilteredDataObjects(options);

	return sparqlFetchAndParse(query, config.sparqlEndpoint, b => ({
			dobj: sparqlBindingToValue<string>(b.dobj),
			spec: sparqlBindingToValue<string>(b.spec),
			fileName: sparqlBindingToValue<string>(b.fileName),
			size: sparqlBindingToValue<number>(b.size),
			submTime: sparqlBindingToValue<Date>(b.submTime),
			timeStart: sparqlBindingToValue<Date>(b.timeStart),
			timeEnd: sparqlBindingToValue<Date>(b.timeEnd)
	}));
}

// TODO: Make parsing to data type more elegant, if possible
const sparqlBindingToValue = <T extends string | number | boolean | Date>(b: SparqlResultValue): T => {
	switch(b.datatype){
		case "http://www.w3.org/2001/XMLSchema#integer": return parseInt(b.value) as T;
		case "http://www.w3.org/2001/XMLSchema#long": return parseInt(b.value) as T;
		case "http://www.w3.org/2001/XMLSchema#float": return parseFloat(b.value) as T;
		case "http://www.w3.org/2001/XMLSchema#double": return parseFloat(b.value) as T;
		case "http://www.w3.org/2001/XMLSchema#dateTime": return new Date(b.value) as T;
		case "http://www.w3.org/2001/XMLSchema#boolean": return (b.value === "true") as T;
		default: return b.value as T;
	}
};

export const searchDobjs = (search: string) => {
	const query = queries.findDobjs(search);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		dobj: b.dobj ? b.dobj.value.split('/').pop() || '' : ''
	}));
};

export const saveCart = (email: string | undefined, cart: Cart): Promise<void> => {
	if (email){
		updatePersonalRestheart(email, {cart});
	}
	return Promise.resolve(sessionStorage.setItem('cp-cart', JSON.stringify(cart)));
};

const updatePersonalRestheart = (email: string | undefined, data: {}): void => {
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

export const getCart = (email: string | undefined) => {
	const sessionStorageCart = sessionStorage.getItem('cp-cart');
	const sessionStorageJson: JsonCart = sessionStorageCart
		? JSON.parse(sessionStorageCart)
		: new Cart().serialize;
	const cartInSessionStorage = {cart: sessionStorageJson};
	const cartInRestheart = email
		? getFromRestheart(email, 'cart') as Promise<{cart: JsonCart}>
		: Promise.resolve({cart: new Cart().serialize});

	return Promise.resolve({cartInSessionStorage, cartInRestheart});
};

const getFromRestheart = (email: string, key: string): Promise<any> => {
	return fetch(`${config.restheartProfileBaseUrl}/${email}?keys={${key}:1}`, {credentials: 'include'})
		.then(resp => {
			return resp.status === 200
				? resp.json()
				: {};
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
				? resp.json()
				: {email: undefined};
		});
}

export const getProfile = (email: string | undefined) => {
	return email
		? getFromRestheart(email, 'profile')
		: Promise.resolve({});
};

export const getExtendedDataObjInfo = (dobjs: UrlStr[]) => {
	if (dobjs.length == 0) return Promise.resolve([]);

	const query = queries.extendedDataObjectInfo(dobjs);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		dobj: b.dobj!.value,
		station: b.station ? b.station.value : undefined,
		stationId: b.stationId ? b.stationId.value : undefined,
		samplingHeight: b.samplingHeight ? parseFloat(b.samplingHeight.value) : undefined,
		theme: b.theme ? b.theme.value : undefined,
		themeIcon: b.themeIcon ? b.themeIcon.value : undefined,
		title: b.title ? b.title.value : undefined,
		description: b.description ? b.description.value : undefined,
		columnNames: b.columnNames ? JSON.parse(b.columnNames.value) : undefined
	}));
};

export const fetchResourceHelpInfo = (uriList: UrlStr[]) => {
	const query = queries.resourceHelpInfo(uriList);

	return sparqlFetch(query, config.sparqlEndpoint, b => ({
		uri: b.uri.value,
		label: b.label ? b.label.value : undefined,
		comment: b.comment ? b.comment.value : undefined,
		webpage: b.webpage ? b.webpage.value : undefined
	}));
};

export const saveTsSetting = (email: string | undefined, spec: string, type: string, val: string) => {
	const settings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};
	const setting = settings[spec] || {};
	const newSetting = Object.assign({}, setting, {[type]: val});
	const newSettings = Object.assign({}, settings, {[spec]: newSetting});
	tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

	if (email){
		updatePersonalRestheart(email, {[tsSettingsStorageName]: newSettings});
	}

	return Promise.resolve(newSettings);
};

export const getTsSettings = (email: string | undefined) => {
	const tsSettings = tsSettingsStorage.getItem(tsSettingsStorageName) || {};

	return email
		? getFromRestheart(email, tsSettingsStorageName).then(settings => {
			const newSettings = settings
				? Object.assign({}, settings[tsSettingsStorageName], tsSettings)
				: tsSettings;
			tsSettingsStorage.setItem(tsSettingsStorageName, newSettings);

			return newSettings;
		})
		: Promise.resolve(tsSettings);
};

export const getMetadata = (id: UrlStr): Promise<DataObject> => {
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
