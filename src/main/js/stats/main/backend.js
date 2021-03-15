import { getJson, sparql, checkStatus } from 'icos-cp-backend';
import config from '../../common/main/config';
import {feature} from 'topojson';
import { getFileNames, getStationLabels, getObjSpecInfo, getContributorNames } from './sparql';
import localConfig from './config';

const pagesize = localConfig.pagesize;

export const getCountryCodesLookup = () => {
	return getJson('https://static.icos-cp.eu/constant/misc/countries.json');
};

export const getSearchParams = (downloadStatsFilters, specLevelLookup) => {
	const { specification, dataLevel, stations, submitters, contributors, dlfrom, originStations, hashId } = downloadStatsFilters;

	const specSpecs = specification && specification.length ? specification : [];
	const dataLevelSpecs = dataLevel && dataLevel.length ? dataLevel.flatMap(dl => specLevelLookup[dl]) : [];
	const combinedSpecs = specSpecs.concat(dataLevelSpecs);
	const specs = combinedSpecs.length ? combinedSpecs : undefined;

	return hashId && hashId.length
		? { hashId: hashId[0] }
		: {
			specs,
			stations: stations && stations.length ? stations : undefined,
			submitters: submitters && submitters.length ? submitters : undefined,
			contributors: contributors && contributors.length ? contributors : undefined,
			dlfrom: dlfrom && dlfrom.length ? dlfrom : undefined,
			originStations: originStations && originStations.length ? originStations : undefined
		};
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/countries-topo-iso2.json')
		.then(topo => feature(topo, topo.objects.countries));
};

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
	const query = getFileNamesFromSparql(aggregationResult._embedded);
	const sparqlResult = sparql({text: query}, config.sparqlEndpoint, true);

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
		return getJson(`${config.restheartDbUrl}portaluse/_aggrs/${aggregationName}?pagesize=${pagesize}&page=${page}`)
			.then(aggregationResult => {

				return combineWithFileNames(aggregationResult);

			}).then(resultWithFileNames => {

				const formatter = getFormatter(aggregationName);
				return formatter(resultWithFileNames);

			});
	};
};

export const getPopularTimeserieVars = _ => {
	return getJson(`${config.restheartDbUrl}portaluse/_aggrs/getPopularTimeserieVars?pagesize=1000&page=1`)
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

export const getDownloadStatsApi = (pageOpt, searchParams) => {
	return postToApi('downloadStats', { ...{ pageOpt, pagesizeOpt: localConfig.pagesize }, ...searchParams })
		.then(downloadStats => {
			if (downloadStats.size === 0) {
				return Promise.resolve(downloadStats);
			}

			return getFileNames(downloadStats.stats.map(ds => config.cpmetaObjectUri + ds.hashId))
				.then(fileNames => ({
					size: downloadStats.size,
					stats: downloadStats.stats.map(ds => ({ ...ds, ...{ fileName: fileNames[config.cpmetaObjectUri + ds.hashId] } }))
				}));
		});
};

export const getSpecsApi = () => {
	return postToApi('specifications')
		.then(specifications => {
			if (specifications.length === 0) {
				return Promise.resolve(specifications);
			}

			return getObjSpecInfo(specifications.map(s => s.spec))
				.then(specLabels =>
					specifications.map(s => ({
						id: s.spec,
						count: s.count,
						label: specLabels[s.spec] ? specLabels[s.spec].label : s.spec.split('/').pop(),
						level: specLabels[s.spec] ? specLabels[s.spec].level : 'Unspecified'
					}))
						.sort((a, b) => a.label.localeCompare(b.label))
				);
		});
};

export const getStationsApi = () => {
	return postToApi('stations')
		.then(stations => {
			if (stations.length === 0) {
				return Promise.resolve(stations);
			}

			return getStationLabels(stations.map(s => s.station))
				.then(stationNames =>
					stations.map(st => ({
						id: st.station,
						count: st.count,
						label: stationNames[st.station] || st.station.split('/').pop()
					}))
						.sort((a, b) => a.label.localeCompare(b.label))
				);
		});
};

export const getContributorsApi = () => {
	return postToApi('contributors')
		.then(contributors => {
			if (contributors.length === 0) {
				return Promise.resolve(contributors);
			}

			return getContributorNames(contributors.map(s => s.contributor))
				.then(contributorNames => 
					contributors.map(c => ({
						id: c.contributor,
						count: c.count,
						label: contributorNames[c.contributor] || c.contributor.split('/').pop()
					}))
						.sort((a, b) => a.label.localeCompare(b.label))
				);
		});
};

export const getSubmittersApi = () => {
	return postToApi('submitters')
		.then(submitters => {
			if (submitters.length === 0) {
				return Promise.resolve(submitters);
			}

			return getStationLabels(submitters.map(s => s.submitter))
				.then(submitterNames =>
					submitters.map(c => ({
						id: c.submitter,
						count: c.count,
						label: submitterNames[c.submitter] || c.submitter.split('/').pop()
					}))
						.sort((a, b) => a.label.localeCompare(b.label))
				);
		});
};

export const postToApi = (endpoint, searchParams, parser) => {
	const url = `api/${endpoint}`;

	return fetch(url, {
		method: 'POST',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(searchParams)
	})
		.then(checkStatus)
		.then(response => response.json())
		.then(data => parser ? data.map(parser) : data);
};
