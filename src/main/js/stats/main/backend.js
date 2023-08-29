import { getJson, sparql, checkStatus } from 'icos-cp-backend';
import config from '../../common/main/config';
import {feature} from 'topojson';
import { getFileNames, getStationLabels, getObjSpecInfo, getContributorNames } from './sparql';
import localConfig from './config';

export const getCountryCodesLookup = () => {
	return getJson('https://static.icos-cp.eu/constant/misc/countries.json');
};

export const getSearchParams = (dlFilters, specLevelLookup) => {
	const { specification, dataLevel, stations, submitters, contributors, dlfrom, originStations, hashId} = dlFilters;

	const dlStart = dlFilters.dlStartd;
	const dlEnd = dlFilters.dlEndd;
	const includeGrayDl = dlFilters.grayDownloadFilter;
	const specSpecs = specification && specification.length ? specification : [];
	const dataLevelSpecs = dataLevel && dataLevel.length ? dataLevel.flatMap(dl => specLevelLookup[dl]) : [];
	const combinedSpecs = specSpecs.concat(dataLevelSpecs);
	const specs = combinedSpecs.length ? combinedSpecs : undefined;

	return hashId && hashId.length
		? {
			hashId: hashId[0],
			dlfrom: dlfrom && dlfrom.length ? dlfrom : undefined,
			dlStart,
			dlEnd,
			includeGrayDl
		}
		: {
			specs,
			stations: stations && stations.length ? stations : undefined,
			submitters: submitters && submitters.length ? submitters : undefined,
			contributors: contributors && contributors.length ? contributors : undefined,
			dlfrom: dlfrom && dlfrom.length ? dlfrom : undefined,
			originStations: originStations && originStations.length ? originStations : undefined,
			dlStart,
			dlEnd,
			includeGrayDl
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
	const sparqlResult = sparql({ text: query }, config.sparqlEndpoint, true);

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
			_returned: aggregationResult._embedded.length
		}
	});
};

const shouldHaveFilenames = [
	"getPreviewTimeserie",
	"getPreviewNetCDF",
	"getPreviewMapGraph",
	"getLibDownloadsByDobj"
];

export const getAggregationResult = aggregationName => {
	return (page = 1, pagesize = localConfig.pagesize) => {
		return getJson(`${config.restheartDbUrl}portaluse/_aggrs/${aggregationName}?pagesize=${pagesize}&page=${page}`)
			.then(([aggregationResult]) => {

				return shouldHaveFilenames.includes(aggregationName)
					? combineWithFileNames(aggregationResult)
					: aggregationResult;

			});
	};
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

export const getSpecsApi = searchParams => {
	return postToApi('specifications', searchParams)
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

export const getStationsApi = searchParams => {
	return postToApi('stations', searchParams)
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

export const getContributorsApi = searchParams => {
	return postToApi('contributors', searchParams)
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

export const getSubmittersApi = searchParams => {
	return postToApi('submitters', searchParams)
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
