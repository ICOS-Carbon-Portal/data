import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart from './models/Cart';
import Storage from './models/Storage';
import 'whatwg-fetch';

const config = Object.assign(commonConfig, localConfig);
const cartStorage = new Storage();
const tsSettingsStorageName = 'tsSettings';
const tsSettingsStorage = new Storage();


export function fetchAllSpecTables() {
	const promises = [queries.specBasics, queries.specColumnMeta, queries.dobjOriginsAndCounts]
		.map(qf => fetchSpecTable(qf, config));

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

function fetchSpecTable(queryFactory) {
	const query = queryFactory(config);

	return sparql(query, config.sparqlEndpoint, true)
		.then(sparqlResultToSpecTable);
}

export function fetchFilteredDataObjects(options){
	const query = queries.listFilteredDataObjects(config, options);

	return sparql(query, config.sparqlEndpoint, true)
		.then(sparqlResultToColNamesAndRows);
}

export const searchDobjs = search => {
	const query = queries.findDobjs(config, search);

	return sparql(query, config.sparqlEndpoint, true)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.dobj.value.split('/').pop()))
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
};

export const searchStations = search => {
	const query = queries.findStations(config, search);

	return sparql(query, config.sparqlEndpoint, true)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.Long_name.value))
					: Promise.reject(new Error("Could not get stations from meta"));
			}
		);
};

export const saveCart = (email, cart) => {
	if (email){
		updatePersonalRestheart(email, {cart});
	}
	return Promise.resolve(cartStorage.setItem('cp-cart', cart));
};

const updatePersonalRestheart = (email, data) => {
	return fetch(`${config.restheartProfileBaseUrl}/${email}`, {
		credentials: 'include',
		method: 'PATCH',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(data)
	});
};

export const getError = errorId => {
	return fetch(`${config.portalUseLogUrl}/${errorId}`).then(resp => {
		return resp.status === 200
			? Promise.resolve(resp.json())
			: Promise.resolve(undefined);
	});
};

export const logOut = () => {
	return fetch('/logout', {credentials: 'include'}).then(resp => {
		return resp.status === 200
			? Promise.resolve(true)
			: Promise.reject(false);
	});
};

export const getCart = email => {
	const sessionStorageJson = cartStorage.getItem('cp-cart')
		? cartStorage.getItem('cp-cart')
		: new Cart();
	const cartInSessionStorage = {cart: sessionStorageJson};
	const cartInRestheart = email
		? getFromRestheart(email, 'cart')
		: Promise.resolve({cart: new Cart()});

	return Promise.resolve({cartInSessionStorage, cartInRestheart});
};

const getFromRestheart = (email, key) => {
	return fetch(`${config.restheartProfileBaseUrl}/${email}?keys={${key}:1}`, {credentials: 'include'})
		.then(resp => {
			return resp.status === 200
				? resp.json()
				: undefined;
		});
};

export const getIsBatchDownloadOk = () => {
	return fetch('../objects?ids=[]&fileName=test', {credentials: 'include'})
		.then(response => response.status === 200);
};

function sparqlResultToColNamesAndRows(sparqlResult) {
	const columnNames = sparqlResult.head.vars;

	const rows = sparqlResult.results.bindings.map(b => {
		const row = {};
		columnNames.forEach(colName => row[colName] = sparqlBindingToValue(b[colName]));
		return row;
	});

	return {columnNames, rows};
}

function sparqlResultToSpecTable(sparqlResult) {
	const {columnNames, rows} = sparqlResultToColNamesAndRows(sparqlResult);
	return new SpecTable(columnNames, rows);
}

function fetchFormatToRdfGraphTbl(){
	return fetch(config.metaServer + '/config/dataObjectGraphInfos')
		.then(res => res.json())
		.then(
			res => res.reduce((acc, row) => {
				acc[row.format] = row.graph;
				return acc;
			}, {})
		);
}

function sparqlBindingToValue(b){
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

export const getProfile = email => {
	return email
		? getFromRestheart(email, 'profile')
		: Promise.resolve({});
};

export const getExtendedDataObjInfo = dobjs => {
	const query = queries.extendedDataObjectInfo(config, dobjs);

	return sparql(query, config.sparqlEndpoint, true)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => {
						return {
							dobj: b.dobj.value,
							station: b.station ? b.station.value : undefined,
							stationId: b.stationId ? b.stationId.value : undefined,
							samplingHeight: b.samplingHeight ? parseFloat(b.samplingHeight.value) : undefined,
							theme: b.theme ? b.theme.value : undefined,
							themeIcon: b.themeIcon ? b.themeIcon.value : undefined,
							title: b.title ? b.title.value : undefined,
							description: b.description ? b.description.value : undefined,
							columnNames: b.columnNames ? JSON.parse(b.columnNames.value) : undefined,
						};
					}))
					: Promise.reject(new Error("Could not get extended info for data objects"));
			}
		);
};

export const saveTsSetting = (email, spec, type, val) => {
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

export const getTsSettings = email => {
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

export const clearTsSettings = _ => {
	tsSettingsStorage.removeItem(tsSettingsStorageName);
};
