import 'whatwg-fetch';
import {getJson, sparql} from 'icos-cp-backend';
import config from '../../common/main/config';
import {feature} from 'topojson';
import localConfig from './config';

const pagesize = localConfig.pagesize;

const restheartBaseUrl = location.host.startsWith("local-")
	? config.restheartBaseUrl.replace("//", "//local-")
	: config.restheartBaseUrl;
const wildcardText = "/^\\w/, null";
const wildcardLevel = "0,1,2,3";

export const getDownloadCounts = (useFullCollection, avars, page = 1) => {
	const parameters = `page=${page}&pagesize=${pagesize}&avars=${avars}`;
	const aggregate = useFullCollection ? 'getDownloadStatsFull' : 'getDownloadStats';

	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/${aggregate}?${parameters}`);
};

export const getDownloadsByCountry = (useFullCollection, avars, page = 1) => {
	const parameters = `page=${page}&pagesize=${pagesize}&avars=${avars}`;
	const aggregate = useFullCollection ? 'downloadsByCountryFull' : 'downloadsByCountry';

	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/${aggregate}?${parameters}`);
};

export const getAvars = (filters, stationCountryCodeLookup = []) => {
	const dataLevel = filters.dataLevel && filters.dataLevel.length ? filters.dataLevel : wildcardLevel;
	const format = filters.format && filters.format.length ? filters.format.map(format => `"${format}"`) : wildcardText;
	const specification = filters.specification && filters.specification.length ? filters.specification.map(spec => `"${spec}"`) : wildcardText;
	const stationsName = stationFilters(filters, stationCountryCodeLookup);
	const contributors = filters.contributors && filters.contributors.length ? filters.contributors.map(contributor => `"${contributor}"`) : wildcardText;
	const themes = filters.themes && filters.themes.length ? filters.themes.map(theme => `"${theme}"`) : wildcardText;

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

	return stationsName.length ? stationsName : wildcardText;
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/countries-topo-iso2.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export const getDownloadsPerDateUnit = (useFullCollection, dateUnit, avars) => {
	let aggregation = `downloadsPer${dateUnit.charAt(0).toUpperCase()}${dateUnit.slice(1)}`;
	if (useFullCollection) aggregation += 'Full';

	return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/${aggregation}?pagesize=1000&np&avars=${avars}`);
};

// Sorting is lost in the bulk insert to new collection. Specify sort order here with key "sort_by".
export function getDataLevels() {
	return getJson(`${restheartBaseUrl}db/cacheForGetDataLevels?sort_by=label&pagesize=1000&page=1`);
}

export function getFormats() {
	return getJson(`${restheartBaseUrl}db/cacheForGetFormats?sort_by=label&pagesize=1000&page=1`);
}

export function getSpecifications() {
	return getJson(`${restheartBaseUrl}db/cacheForGetSpecifications?sort_by=count&pagesize=1000&page=1`);
}

export function getStations() {
	return getJson(`${restheartBaseUrl}db/cacheForGetStations?sort_by=label&pagesize=1000&page=1`);
}

export function getContributors() {
	return getJson(`${restheartBaseUrl}db/cacheForGetContributors?sort_by=label&pagesize=1000&page=1`);
}

export function getThemes() {
	return getJson(`${restheartBaseUrl}db/cacheForGetThemes?sort_by=label&pagesize=1000&page=1`);
}

export function getStationsCountryCode() {
	return sparql(stationsCountryCode(), config.sparqlEndpoint, true)
		.then(
			sparqlResult => {
				// Create an array of country codes [SV,EN,...]
				const bindings = sparqlResult.results.bindings.map(b => b.countryCode.value);

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


// Previews
const getFileNames = resultList => {
	const dobjs = resultList.map(obj => `<https://meta.icos-cp.eu/objects/${obj._id}>`).join(' ');

	return `
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select ?dobj ?fileName where{
	VALUES ?dobj { ${dobjs} }
    ?dobj cpmeta:hasName ?fileName
}`
};

const combineWithFileNames = (aggregationResult) => {
	const sparqlResult = sparql(getFileNames(aggregationResult._embedded), config.sparqlEndpoint, true);

	return sparqlResult.then(res => {
		return {
			aggregationResult,
			fileNameMappings: res.results.bindings.reduce((acc, curr) => {
				const objId = curr.dobj.value.slice(32);
				acc[objId] = curr.fileName.value;
				return acc;
			}, {})
		};
	});
};

const joinResult = (aggregationResult, fileNameMappings) => {
	const _embedded = aggregationResult._embedded.map(pt => Object.assign(pt, {
		fileName: fileNameMappings[pt._id]
	}));

	return {
		_embedded,
		_size: aggregationResult._size,
		_returned: aggregationResult._returned
	}
};

export const getPreviewTimeserie = (page = 1) => {
	return getJson(`${restheartBaseUrl}db/portaluse/_aggrs/getPreviewTimeserie?pagesize=${pagesize}&page=${page}`)
		.then(previewTimeserie => {

			return combineWithFileNames(previewTimeserie);

		}).then(({aggregationResult, fileNameMappings}) => {

			return joinResult(aggregationResult, fileNameMappings);

		});
};

export const getPreviewNetCDF = (page = 1) => {
	return getJson(`${restheartBaseUrl}db/portaluse/_aggrs/getPreviewNetCDF?pagesize=${pagesize}&page=${page}`)
		.then(previewNetCDF => {

			return combineWithFileNames(previewNetCDF);

		}).then(({aggregationResult, fileNameMappings}) => {

			return joinResult(aggregationResult, fileNameMappings);

		});
};

export const getPopularTimeserieVars = (page = 1) => {
	return getJson(`${restheartBaseUrl}db/portaluse/_aggrs/getPopularTimeserieVars?pagesize=1000&page=${page}`);
};
