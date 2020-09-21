import {getJson, sparql} from 'icos-cp-backend';
import config from '../../common/main/config';
import {feature} from 'topojson';
import { getFileNames, getStationLabels, getObjSpecLabels, getContributorNames } from './sparql';
import localConfig from './config';

const pagesize = localConfig.pagesize;

const restheartBaseUrl = location.host.startsWith("local-")
	? config.restheartBaseUrl.replace("//", "//local-")
	: config.restheartBaseUrl;

const restheartDbUrl = config.envri === "ICOS"
	? `${restheartBaseUrl}db/`
	: `${restheartBaseUrl}sitesdb/`;

const wildcardText = "/^\\w/, null";
const wildcardLevel = "0,1,2,3";

export const getDownloadCounts = (useFullCollection, avars, page = 1) => {
	const parameters = `page=${page}&pagesize=${pagesize}&avars=${avars}`;
	const aggregate = useFullCollection ? 'getDownloadStatsFull' : 'getDownloadStats';

	return getJson(`${restheartDbUrl}dobjdls/_aggrs/${aggregate}?${parameters}`);
};

export const getDownloadsByCountry = (useFullCollection, avars, page = 1) => {
	const parameters = `page=${page}&pagesize=${pagesize}&avars=${avars}`;
	const aggregate = useFullCollection ? 'downloadsByCountryFull' : 'downloadsByCountry';

	return getJson(`${restheartDbUrl}dobjdls/_aggrs/${aggregate}?${parameters}`);
};

export const getAvars = (filters, stationCountryCodeLookup = []) => {
	const searchParams = getSearchParams(filters, stationCountryCodeLookup);

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

export const getSearchParams = (filters) => {
	const searchParams = {
		specs: filters.specification && filters.specification.length ? filters.specification : undefined,
		stations: filters.stations && filters.stations.length ? filters.stations : undefined,
		submitters: undefined,
		contributors: filters.contributors && filters.contributors.length ? filters.contributors : undefined
	};

	const searchParamsReduced = Object.keys(searchParams).reduce((acc, key) => {
		if (searchParams[key]) acc.push({ name: key, values: searchParams[key] });
		return acc;
	}, []);

	return searchParamsReduced.map(fp => `${fp.name}=${encodeURIComponent(JSON.stringify(fp.values))}`).join('&');
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

	return getJson(`${restheartDbUrl}dobjdls/_aggrs/${aggregation}?pagesize=1000&np&avars=${avars}`);
};

// Sorting is lost in the bulk insert to new collection. Specify sort order here with key "sort_by".
export function getDataLevels() {
	return getJson(`${restheartDbUrl}cacheForGetDataLevels?sort_by=label&pagesize=1000&page=1`);
}

export function getFormats() {
	return getJson(`${restheartDbUrl}cacheForGetFormats?sort_by=label&pagesize=1000&page=1`);
}

export function getSpecifications() {
	return getJson(`${restheartDbUrl}cacheForGetSpecifications?sort_by=count&pagesize=1000&page=1`);
}

export function getStations() {
	return getJson(`${restheartDbUrl}cacheForGetStations?sort_by=label&pagesize=1000&page=1`);
}

export function getContributors() {
	return getJson(`${restheartDbUrl}cacheForGetContributors?sort_by=label&pagesize=1000&page=1`);
}

export function getThemes() {
	return getJson(`${restheartDbUrl}cacheForGetThemes?sort_by=label&pagesize=1000&page=1`);
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
const getFileNamesFromSparql = resultList => {
	const dobjs = resultList.map(obj => `<${config.cpmetaObjectUri}${obj._id}>`).join(' ');

	return `
prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
select ?dobj ?fileName where{
	VALUES ?dobj { ${dobjs} }
    ?dobj cpmeta:hasName ?fileName
}`
};

const combineWithFileNames = (aggregationResult) => {
	const sparqlResult = sparql(getFileNamesFromSparql(aggregationResult._embedded), config.sparqlEndpoint, true);

	return sparqlResult.then(res => {
		const fileNameMappings = res.results.bindings.reduce((acc, curr) => {
			const objId = curr.dobj.value.split('/objects/').pop();
			acc[objId] = curr.fileName.value;
			return acc;
		}, {});

		return {
			_embedded: aggregationResult._embedded.map(pt => Object.assign(pt, {
				fileName: fileNameMappings[pt._id]
			})),
			_size: aggregationResult._size,
			_returned: aggregationResult._returned
		}
	});
};

export const getPreviewAggregation = aggregationName => {
	return (page = 1) => {
		return getJson(`${restheartDbUrl}portaluse/_aggrs/${aggregationName}?pagesize=${pagesize}&page=${page}`)
			.then(aggregationResult => {

				return combineWithFileNames(aggregationResult);

			}).then(resultWithFileNames => {

				const formatter = getFormatter(aggregationName);
				return formatter(resultWithFileNames);

			});
	};
};

export const getPopularTimeserieVars = _ => {
	return getJson(`${restheartDbUrl}portaluse/_aggrs/getPopularTimeserieVars?pagesize=1000&page=1`)
		.then(aggregationResult => formatPopularTimeserieVars(aggregationResult));
};

const getFormatter = aggregationName => {
	switch (aggregationName){

		case 'getPreviewTimeserie':
			return formatTimeserieData;

		case 'getPreviewNetCDF':
			return formatNetCDFData;

		case 'getPreviewMapGraph':
			return formatMapGraphData;
	}
};

const conformData = (previewData, data) => {
	return {
		data,
		_size: previewData._size,
		_returned: previewData._returned
	}
};

const formatTimeserieData = joinedResult => {
	const formattedData = joinedResult._embedded.map(dobj => {
		return Object.assign(dobj, {
			x: dobj.x.sort((a, b) => a.count < b.count).map(x => x.name).join(', '),
			y: dobj.y.sort((a, b) => a.count < b.count).map(y => y.name).join(', ')
		})
	});

	return conformData(joinedResult, formattedData);
};

const formatNetCDFData = joinedResult => {
	const formattedData = joinedResult._embedded.map(dobj => {
		return Object.assign(dobj, {
			variables: dobj.variables.sort((a, b) => a.count < b.count).map(variable => variable.name).join(', ')
		})
	});

	return conformData(joinedResult, formattedData);
};

const formatMapGraphData = joinedResult => {
	const formattedData = joinedResult._embedded.map(dobj => {
		return Object.assign(dobj, {
			mapView: dobj.mapView.sort((a, b) => a.count < b.count).map(mapView => mapView.name).join(', '),
			y1: dobj.y1.sort((a, b) => a.count < b.count).map(y1 => y1.name).join(', '),
			y2: dobj.y2.sort((a, b) => a.count < b.count).map(y2 => y2.name).join(', ')
		})
	});

	return conformData(joinedResult, formattedData);
};

const formatPopularTimeserieVars = popularTimeserieVars => {
	const formattedData = popularTimeserieVars._embedded.map(p => {
		return {
			name: p.name,
			val: p.val,
			count: p.occurrences
		};
	});

	return conformData(popularTimeserieVars, formattedData);
};

export const getDownloadStatsApi = async (page, searchParams) => {
	const downloadStats = await callApi('downloadStats', `page=${page}&pagesize=${localConfig.pagesize}&${searchParams}`);

	if (downloadStats.size === 0) {
		return Promise.resolve(downloadStats);
	}

	return getFileNames(downloadStats.stats.map(ds => config.cpmetaObjectUri + ds.hashId))
		.then(fileNames => ({
			size: downloadStats.size,
			stats: downloadStats.stats.map(ds => ({ ...ds, ...{ fileName: fileNames[config.cpmetaObjectUri + ds.hashId] } }))
		}));
};

export const getSpecsApi = async () => {
	const specifications = await callApi('specifications');

	if (specifications.size === 0) {
		return Promise.resolve(specifications);
	}

	return getObjSpecLabels(specifications.map(s => s.spec))
		.then(specLabels => specifications.map(s => ({
			id: s.spec,
			count: s.count,
			label: specLabels[s.spec]
		})));
};

export const getStationsApi = async () => {
	const stations = await callApi('stations');

	if (stations.size === 0) {
		return Promise.resolve(stations);
	}

	return getStationLabels(stations.map(s => s.station))
		.then(stationNames => stations.map(st => ({
			id: st.station,
			count: st.count,
			label: stationNames[st.station]
		})));
};

export const getContributorsApi = async () => {
	const contributors = await callApi('contributors');

	if (contributors.size === 0) {
		return Promise.resolve(contributors);
	}

	return getContributorNames(contributors.map(s => s.contributor))
		.then(contributorNames => {
			return contributors.map(c => ({
				id: c.contributor,
				count: c.count,
				label: contributorNames[c.contributor]
			}))
		});
};

export const callApi = (endpoint, searchParams, parser) => {
	const url = searchParams ? `api/${endpoint}?${searchParams}` : `api/${endpoint}`;

	return getJson(url)
		.then(data => parser ? data.map(parser): data);
};

export const postToApi = (searchParams, endpoint) => {
	return fetch(endpoint, {
		method: 'POST',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(searchParams)
	});
};
