import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart from './models/Cart';
import 'whatwg-fetch';

const config = Object.assign(commonConfig, localConfig);

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
};

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
		updatePersonalRestheart('users', email, {cart});
	}
	return Promise.resolve(localStorage.setItem('cp-cart', JSON.stringify(cart)));
};

const updatePersonalRestheart = (db, email, data) => {
	return fetch(`${config.restheartBaseUrl}/${db}/${email}`, {
		credentials: 'include',
		method: 'PATCH',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(data)
	}).then(resp => resp);
};

export const updatePortalUsage = (data) => {
	return fetch(`${config.restheartPortalUseBaseUrl}/portaluse`, {
		method: 'POST',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(data)
	}).then(resp => resp);
};

export const getCart = email => {
	const localStorageJson = localStorage.getItem('cp-cart')
		? JSON.parse(localStorage.getItem('cp-cart'))
		: new Cart();
	const cartInLocalStorage = {cart: localStorageJson};
	const cartInRestheart = email
		? getCartFromRestheart(email)
		: Promise.resolve({cart: new Cart()});

	return Promise.resolve({cartInLocalStorage, cartInRestheart});
};

const getCartFromRestheart = email => {
	return fetch(`${config.restheartBaseUrl}/users/${email}?keys={cart:1}`, {credentials: 'include'})
		.then(resp => {
			return resp.status === 200
				? resp.json()
				: undefined;
		});
};

export const getIsBatchDownloadOk = ids => {
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
	const query = queries.rdfGraphsAndSpecFormats(config);
	return sparql(query, config.sparqlEndpoint, true).then(
		res => res.results.bindings.reduce((acc, row) => {
			acc[row['format'].value] = row['graph'].value
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
				: {email: undefined, ip: undefined};
		});
}

const getProfile = email => {
	return email
		? fetch(`https://${config.restheartBaseUrl}/users/${email}?keys={profile:1}`, {credentials: 'include'})
			.then(profile => {
				return profile.status === 200
					? profile.json()
					: {}
			})
		: Promise.resolve({});
};

export const getUserInfo = () => {
	return getWhoIam()
		.then(user => {
			return {
				profilePromise: getProfile(user.email),
				user
			};
		})
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
							theme: b.theme ? b.theme.value : undefined,
							themeIcon: b.themeIcon ? b.themeIcon.value : undefined,
							title: b.title ? b.title.value : undefined,
							description: b.description ? b.description.value : undefined,
						};
					}))
					: Promise.reject(new Error("Could not get extended info for data objects"));
			}
		);
};
