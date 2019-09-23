import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart, {JsonCart} from './models/Cart';
import Storage from './models/Storage';
import 'whatwg-fetch';
import {SparqlResult, SparqlResultBinding} from './backend/sparql';
import {KeyAnyVal, UrlStr} from "./backend/declarations";
import {DataObject} from "../../common/main/metacore";

const config = Object.assign(commonConfig, localConfig);
const tsSettingsStorageName = 'tsSettings';
const tsSettingsStorage = new Storage();

export function fetchAllSpecTables() {
	const promises = [queries.specBasics, queries.specColumnMeta, queries.dobjOriginsAndCounts]
		.map(qf => fetchSpecTable(qf));

	promises.push(fetchFormatToRdfGraphTbl());

	return Promise.all(promises).then(
		([basics, columnMeta, origins, formatToRdfGraph]) => {
			return {
				specTables: {basics, columnMeta, origins},
				formatToRdfGraph
			};
		}
	);
}

function fetchSpecTable(queryFactory: Function) {
	const query = queryFactory(config);

	return sparql(query, config.sparqlEndpoint, true)
		.then(sparqlResultToSpecTable);
}

export function fetchFilteredDataObjects(options: {}){
	const query = queries.listFilteredDataObjects(config, options);

	return sparql(query, config.sparqlEndpoint, true)
		.then(sparqlResultToColNamesAndRows);
}

export const searchDobjs = (search: string): Promise<string | undefined> => {
	const query = queries.findDobjs(config, search);

	return sparql(query, config.sparqlEndpoint, true)
		.then(
			(sparqlResult: SparqlResult<'dobj'>) => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.dobj!.value.split('/').pop()))
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
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

function sparqlResultToColNamesAndRows(sparqlResult: SparqlResult) {
	const columnNames = sparqlResult.head.vars;

	const rows = sparqlResult.results.bindings.map(b => {
		const row: KeyAnyVal = {};
		columnNames.forEach(colName => row[colName] = sparqlBindingToValue(b[colName]));
		return row;
	});

	return {columnNames, rows};
}

function sparqlResultToSpecTable(sparqlResult: SparqlResult) {
	const {columnNames, rows} = sparqlResultToColNamesAndRows(sparqlResult);
	return new SpecTable(columnNames, rows);
}

function fetchFormatToRdfGraphTbl(){
	return fetch(config.metaServer + '/config/dataObjectGraphInfos')
		.then(res => res.json())
		.then(
			res => res.reduce((acc: KeyAnyVal, row: KeyAnyVal) => {
				acc[row.format] = row.graph;
				return acc;
			}, {})
		);
}

function sparqlBindingToValue(b: SparqlResultBinding | undefined){
	if(!b) return undefined;
	switch(b.datatype){
		case "http://www.w3.org/2001/XMLSchema#integer": return parseInt(b.value);
		case "http://www.w3.org/2001/XMLSchema#float": return parseFloat(b.value);
		case "http://www.w3.org/2001/XMLSchema#double": return parseFloat(b.value);
		case "http://www.w3.org/2001/XMLSchema#dateTime": return new Date(b.value);
		default: return b.value;
	}
}

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

export interface ExtendedDataObjInfo {
	dobj: string,
	station: string | undefined,
	stationId: string | undefined,
	samplingHeight: string | undefined,
	theme: string | undefined,
	themeIcon: string | undefined,
	title: string | undefined,
	description: string | undefined,
	columnNames: any | undefined
}
export const getExtendedDataObjInfo = (dobjs: UrlStr[]): Promise<ExtendedDataObjInfo | [] | Error> => {
	if (dobjs.length == 0) return Promise.resolve([]);

	const query = queries.extendedDataObjectInfo(config, dobjs);

	return sparql(query, config.sparqlEndpoint, true)
		.then((sparqlResult: SparqlResult) => {
			const bindings = sparqlResult.results.bindings;

			return bindings
				? bindings.map(b => {
					return {
						dobj: b.dobj!.value,
						station: b.station ? b.station.value : undefined,
						stationId: b.stationId ? b.stationId.value : undefined,
						samplingHeight: b.samplingHeight ? parseFloat(b.samplingHeight.value) : undefined,
						theme: b.theme ? b.theme.value : undefined,
						themeIcon: b.themeIcon ? b.themeIcon.value : undefined,
						title: b.title ? b.title.value : undefined,
						description: b.description ? b.description.value : undefined,
						columnNames: b.columnNames ? JSON.parse(b.columnNames.value) : undefined,
					};
				})
				: new Error("Could not get extended info for data objects");
			}
		);
};

export interface ResourceHelpInfo {
	uri: string,
	label: string | undefined,
	comment: string | undefined,
	webpage: string | undefined
}

export const fetchResourceHelpInfo = (uriList: UrlStr[]): Promise<ResourceHelpInfo | Error> => {
	const query = queries.resourceHelpInfo(uriList);

	return sparql(query, config.sparqlEndpoint, true).then((sparqlResult: SparqlResult) => {
		const bindings = sparqlResult.results.bindings;

		return bindings
			? Promise.resolve(bindings.map(b => {
				return {
					uri: b.uri!.value,
					label: b.label ? b.label.value : undefined,
					comment: b.comment ? b.comment.value : undefined,
					webpage: b.webpage ? b.webpage.value : undefined
				}
			}))
			: Promise.reject(new Error("Could not get resource info for list of uri=" + uriList.join(', ')));
	})
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

export const clearTsSettings = () => {
	tsSettingsStorage.removeItem(tsSettingsStorageName);
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
