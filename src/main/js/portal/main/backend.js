import {sparql} from 'icos-cp-backend';
import * as queries from './sparqlQueries';
import SpecTable from './models/SpecTable';
import commonConfig from '../../common/main/config';
import localConfig from './config';
import Cart from './models/Cart';
import 'whatwg-fetch';

const config = Object.assign(commonConfig, localConfig);

export function fetchAllSpecTables() {
	return Promise.all(
		[queries.specBasics, queries.specColumnMeta, queries.dobjOriginsAndCounts]
			.map(qf => fetchSpecTable(qf, config))
	).then(
		([basics, columnMeta, origins]) => {
			return {basics, columnMeta, origins};
		}
	);
};

function fetchSpecTable(queryFactory) {
	const query = queryFactory(config);

	return sparql(query, config.sparqlEndpoint)
		.then(sparqlResultToSpecTable);
}

export function fetchFilteredDataObjects(dobjRequest){
	const query = queries.listFilteredDataObjects(config, dobjRequest);

	return sparql(query, config.sparqlEndpoint)
		.then(sparqlResultToColNamesAndRows);
}

export const searchDobjs = search => {
	const query = queries.findDobjs(config, search);

	return sparql(query, config.sparqlEndpoint)
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

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;

				return bindings
					? Promise.resolve(bindings.map(b => b.Long_name.value))
					: Promise.reject(new Error("Could not get stations from meta"));
			}
		);
};

export const getObjColInfo = dobj => {
	const query = queries.dobjColInfo(config, dobj);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const vars = sparqlResult.head.vars;
				const bindings = sparqlResult.results.bindings;

				const colInfo = vars.map(v => {
					return {
						name: v,
						data: bindings.map(b => {
							return b[v].value === "?" ? undefined : b[v].value;
						})
					};
				});

				return bindings
					? Promise.resolve(colInfo)
					: Promise.reject(new Error("Could not find dobj " + dobj));
			}
		);
};

export const saveCart = (email, cart) => {
	if (email){
		updateRestheart('users', email, {cart});
	}
	return Promise.resolve(localStorage.setItem('cp-cart', JSON.stringify(cart)));
};

const updateRestheart = (db, email, data) => {
	return fetch(`${config.restheartBaseUrl}${db}/${email}`, {
		credentials: 'include',
		method: 'PATCH',
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
	return fetch(`${config.restheartBaseUrl}users/${email}?keys={cart:1}`, {credentials: 'include'})
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

export const getUserInfo = () => {
	return getWhoIam()
		.then(user => {
			return user.email
				? fetch(`https://cpauth.icos-cp.eu/db/users/${user.email}?keys={profile:1}`, {credentials: 'include'})
				: {};
		})
		.then(resp => {
			return resp.status === 200
				? resp.json()
				: {};
		});
};

export const logOutUser = () => {
	return fetch('https://cpauth.icos-cp.eu/logout', {credentials: 'include'})
		.then(resp => {
			return {};
		});
};
