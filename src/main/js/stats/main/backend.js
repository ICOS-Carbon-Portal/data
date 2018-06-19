import 'whatwg-fetch';
import {getJson, sparql} from 'icos-cp-backend';
import config from '../../common/main/config';
import {feature} from 'topojson';

const restheartBaseUrl = config.restheartBaseUrl;

export const getDownloadCounts = (avars, page = 1) => {
	const parameters = `page=${page}&avars=${avars}`;
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getDownloadStats?${parameters}`);
};

export const getDownloadsByCountry = (avars, page = 1) => {
	const parameters = `page=${page}&pagesize=300&avars=${avars}`;
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/downloadsByCountry?np&${parameters}`);
};

export const getAvars = (filters, stationCountryCodeLookup = []) => {
	const dataLevel = filters.dataLevel && filters.dataLevel.length ? filters.dataLevel : "0,1,2,3";
	const format = filters.format && filters.format.length ? filters.format.map(format => `"${format}"`) : "/.*/, null";
	const specification = filters.specification && filters.specification.length ? filters.specification.map(spec => `"${spec}"`) : "/.*/, null";
	const stationsName = stationFilters(filters, stationCountryCodeLookup);
	const contributors = filters.contributors && filters.contributors.length ? filters.contributors.map(contributor => `"${contributor}"`) : "/.*/, null";
	const themes = filters.themes && filters.themes.length ? filters.themes.map(theme => `"${theme}"`) : "/.*/, null";

	return `{
		"specification":[${specification}],
		"format":[${format}],
		"dataLevel":[${dataLevel}],
		"stations":[${stationsName}],
		"contributors":[${contributors}],
		"themes":[${themes}]
	}`;
};

const stationFilters = (filters, stationCountryCodeLookup) => {
	let stations = filters.stations && filters.stations.length ? filters.stations.map(station => `"${station}"`) : [];
	let ccStations = filters.countryCodes && filters.countryCodes.length ? stationCountryCodeLookup.filter(cc => filters.countryCodes.includes(cc.code)) : [];
	let stationsName = stations.concat(ccStations.map(cc => `"${cc.name}"`));

	return stationsName.length ? stationsName : "/.*/, null";
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/countries-topo-iso2.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export function getDataLevels() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getDataLevels?pagesize=100&page=1`);
}

export function getFormats() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getFormats?pagesize=100&page=1`);
}

export function getSpecifications() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getSpecifications?pagesize=100&page=1`);
}

export function getStations() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getStations?pagesize=100&page=1`);
}

export function getContributors() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getContributors?pagesize=100&page=1`);
}

export function getThemes() {
	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getThemes?pagesize=100&page=1`);
}

export function getStationsCountryCode() {
	return sparql(stationsCountryCode(), config.sparqlEndpoint, true)
		.then(
			sparqlResult => {
				// Create an array of country codes [SV,EN,...]
				const bindings = sparqlResult.results.bindings.map(b => b.countryCode.value)

				// Remove duplicates
				let uniqueCountryCodes = [...new Set(bindings)];

				// Expand elements to objects with _id and label fields
				let countryCodeFilter = uniqueCountryCodes.map(code => ({_id: code, label: code}));

				// Create an array to map country codes with their names and uri
				const stationCountryCodeLookup = sparqlResult.results.bindings.map(b => ({
					name: b.name.value,
					code: b.countryCode.value
				}));

				return uniqueCountryCodes
					? Promise.resolve({stationCountryCodeLookup, countryCodeFilter})
					: Promise.reject(new Error("Could not get stations from meta"));
			}
		)
}

export function fetchSpecTable(queryFactory) {
	const query = queryFactory();

	return sparql(query, config.sparqlEndpoint, true);
}

function stationsCountryCode() {
	return `prefix cpmeta: <${config.cpmetaOntoUri}>
select ?name ?countryCode where{
  ?station cpmeta:hasName ?name .
  ?station cpmeta:countryCode ?countryCode .
}
order by ?label`;
}
