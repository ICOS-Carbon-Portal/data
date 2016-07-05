import { ROUTE_UPDATED, FILTER_UPDATED, GOT_GLOBAL_TIME_INTERVAL, GOT_PROP_VAL_COUNTS,
	FETCHING_META, FETCHED_STATIONS, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, REMOVE_DATA, REMOVED_DATA, PIN_DATA, ERROR} from './actions';
import {getLabels, generateChartData} from './models/chartDataMaker';
import StationsInfo from './models/StationsInfo';
import config from './config';

export default function(state, action){

	switch(action.type){
		case ROUTE_UPDATED:
			const currentRoute = window.location.hash.substr(1);

			if (currentRoute != action.route) {
				window.location.hash = action.route;
			}

			return Object.assign({}, state, {route: action.route});

		case FETCHING_META:
			return Object.assign({}, state, {status: FETCHING_META});

		case FETCHING_DATA:
			return Object.assign({}, state, {status: FETCHING_DATA});

		case FETCHED_META:
			return Object.assign({}, state, {
				status: FETCHED_META,
				tableFormat: action.tableFormat
			});

		case FETCHED_STATIONS:
			return Object.assign({}, state, {
				status: FETCHED_STATIONS,
				stations: new StationsInfo(action.stationInfo)
			});

		case PIN_DATA:
			return Object.assign({}, state, {
				status: PIN_DATA,
				dataObjects: updateDataObjects(state.dataObjects, action.dataObjectInfo.id, 'pinned')
			});

		case FETCHED_DATA:
			if (state.dataObjId === action.dataObjId){
				const dataObjects = action.format && action.binTable
					// Fetch data
					? updateDataObjects(state.dataObjects, action.dataObjId, 'view', action.format, action.binTable)
					// Use cached data
					: updateDataObjects(state.dataObjects, action.dataObjId, 'view');

				const labels = getLabels(dataObjects);

				return Object.assign({}, state, {
					status: FETCHED_DATA,
					dataObjects,
					forChart: generateChartData(dataObjects, labels),
					forMap: getMapData(dataObjects, labels),
					format: action.format
				});
			} else {
				return state;
			}

		case DATA_CHOSEN:
			return Object.assign({}, state, {dataObjId: action.dataObjId});
		
		case REMOVE_DATA:
			const dataObjects = updateDataObjects(state.dataObjects, action.dataObjId, 'view');
			const labels = getLabels(dataObjects);

			return Object.assign({}, state, {
				status: REMOVED_DATA,
				dataObjects,
				forChart: generateChartData(dataObjects, labels),
				forMap: getMapData(dataObjects, labels),
				format: state.format
			});

		case ERROR:
			return Object.assign({}, state, {status: ERROR, error: action.error});

		case FILTER_UPDATED:
			return Object.assign({}, state, {
				filters: Object.assign({}, state.filters, action.update)
			});

		case GOT_GLOBAL_TIME_INTERVAL:
			return state.objectSpecification === action.objectSpecification
				? Object.assign({}, state, {
					fromDateMin: action.min,
					toDateMax: action.max
				})
				: state;

		case GOT_PROP_VAL_COUNTS:
			if (state.objectSpecification === action.objectSpecification) {
				const stationCounts = action.propsAndVals.propValCount[config.stationProp] || [];
				const filteredStationUris = stationCounts.map(({value}) => value);

				const filteredDataObjects = action.propsAndVals.filteredDataObjects;
				const dataObjects = loadDataObjects(state.dataObjects, filteredDataObjects);
				const labels = getLabels(dataObjects);

				// TODO: Handle zero data objects returned from filters

				return Object.assign({}, state, {
					propValueCounts: action.propsAndVals.propValCount,
					filteredDataObjects,
					dataObjects,
					forChart: generateChartData(dataObjects, labels),
					forMap: getMapData(dataObjects, labels),
					stations: state.stations.withSelected(filteredStationUris),
					cache: {
						propsAndVals: state.cache.propsAndVals || action.propsAndVals
					}
				});
			} else {
				return state;
			}

		default:
			return state;
	}

}

function getMapData(dataObjects, labels){
	return dataObjects.filter(dob => dob.view).map((dob, idx) => {
		return {
			id: dob.id,
			geom: (dob.metaData.geom.lat && dob.metaData.geom.lon)
				? {lat: dob.metaData.geom.lat, lon: dob.metaData.geom.lon}
				: {lat: null, lon: null}
			,
			popup: dob.metaData.format.filter(frm => frm.prop == config.wdcggStationProp).map(frm =>{
				return {
					stationName: frm.value,
					label: labels.slice(idx, idx + 1)[0]
				}
			})[0]
		}
	});
}

function loadDataObjects(dataObjects, filteredDataObjects){
	const dobs = dataObjects.filter(dob => dob.pinned || (dob.view && filteredDataObjects.findIndex(fdo => fdo.id == dob.id) >= 0));
	const fdos = filteredDataObjects.map(fdo => {
		return {
			id: fdo.id,
			fileName: fdo.fileName,
			nRows: fdo.nRows,
			pinned: false,
			view: false,
			metaData: null,
			binTable: null
		}
	});

	return dobs.concat(
		fdos.filter(fdo => dobs.findIndex(dob => dob.id == fdo.id) < 0)
	);
}

function updateDataObjects(dataObjects, dataObjId, prop, format, binTable){
	const dobs = dataObjects.slice(0);
	const dobIdx = dobs.findIndex(dob => dob.id == dataObjId);
	dobs[dobIdx][prop] = !dobs[dobIdx][prop];

	if (prop == 'view' && format && binTable) {
		dobs[dobIdx].metaData = getMetaData(format, dataObjId);
		dobs[dobIdx].binTable = binTable;
	}

	return dobs;
}

function getMetaData(format, dataObjId){
	let geom = {
		lat: null,
		lon: null
	};

	let newFormat = [{label: "LANDING PAGE", value: dataObjId}];

	format.forEach(obj => {
		if (obj.prop === config.wdcggLatProp){
			geom.lat = obj.value;
		} else if (obj.prop === config.wdcggLonProp){
			geom.lon = obj.value;
		} else {
			newFormat.push(obj);
		}
	});

	return {geom, format: newFormat};
}

// function makeAllowedDate(proposedValue, defaultValue, state){
// 	if(!proposedValue) return defaultValue;
//
// 	let maxAllowed = new Date(state.toDateMax);
// 	let minAllowed = new Date(state.fromDateMin);
// 	let date = new Date(proposedValue);
//
// 	if(date < minAllowed) return minAllowed.toISOString()
// 	else if(date > maxAllowed) return maxAllowed.toISOString()
// 	else return proposedValue;
// }
