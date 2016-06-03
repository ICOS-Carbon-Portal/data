import { ROUTE_UPDATED, FROM_DATE_SET, TO_DATE_SET, FILTER_UPDATED, GOT_GLOBAL_TIME_INTERVAL, GOT_PROP_VAL_COUNTS,
	FETCHING_META, FETCHING_SPATIAL, FETCHED_SPATIAL, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, REMOVE_DATA, REMOVED_DATA, PIN_DATA, ERROR} from './actions';
import {getLabels, generateChartData} from './models/chartDataMaker';
import config from './config';
import { SpatialFilter } from './models/Filters';

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

		case FETCHING_SPATIAL:
			return Object.assign({}, state, {status: FETCHING_SPATIAL});

		case FETCHING_DATA:
			return Object.assign({}, state, {status: FETCHING_DATA});

		case FETCHED_META:
			return Object.assign({}, state, {
				status: FETCHED_META,
				tableFormat: action.tableFormat
			});

		case FETCHED_SPATIAL:
			return Object.assign({}, state, {
				spatial: {
					stations: action.stationPositions,
					forMap: action.stationPositions
				}
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

		case FROM_DATE_SET: {
			let newDate = makeAllowedDate(action.date, state.fromDateMin, state);
			return Object.assign({}, state, {fromDate: newDate});
		}

		case TO_DATE_SET: {
			let newDate = makeAllowedDate(action.date, state.toDateMax, state);
			return Object.assign({}, state, {toDate: newDate});
		}

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
			if (
				state.objectSpecification === action.objectSpecification &&
				state.fromDate === action.fromDate &&
				state.toDate === action.toDate
			) {
				const spatiallyFilteredStations = getFilteredStations(
					state.spatial.stations,
					state.filters[config.spatialStationProp],
					action.propsAndVals.propValCount[config.wdcggStationProp]
				);
				const filteredDataObjects = filteredDO2Arr(action.propsAndVals.filteredDataObjects, state.filteredDataObjects);
				const dataObjects = loadDataObjects(state.dataObjects, filteredDataObjects);
				const labels = getLabels(dataObjects);

				return Object.assign({}, state, {
					propValueCounts: action.propsAndVals.propValCount,
					filteredDataObjects,
					dataObjects,
					forChart: generateChartData(dataObjects, labels),
					forMap: getMapData(dataObjects, labels),
					spatial: {
						stations: state.spatial.stations,
						forMap: spatiallyFilteredStations
					}
				});
			} else {
				return state;
			}

		default:
			return state;
	}

}

function getFilteredStations(stations, spatialFilter, propValStations){
	const spatialStations = spatialFilter.isEmpty() ? stations : spatialFilter.list;
	return spatialStations.filter(spatialStation => propValStations.findIndex(pvs => pvs.value == spatialStation.name) >= 0);
}

function getMapData(dataObjects, labels){
	return dataObjects.filter(dob => dob.view).map((dob, idx) => {
		return {
			id: dob.id,
			geom: (dob.metaData.geom.lat && dob.metaData.geom.lon)
				? {lat: dob.metaData.geom.lat, lon: dob.metaData.geom.lon}
				: {lat: 0, lon: 0}
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

function filteredDO2Arr(filteredDataObjects, oldFilteredDataObjects){
	if (filteredDataObjects){
		const oldFdos = oldFilteredDataObjects || [];

		function* obj2Arr(obj) {
			for (let prop of Object.keys(obj)) {
				yield {
					id: prop,
					fileName: obj[prop][0].value,
					nRows: obj[prop][0].count
				};
			}
		}

		return Array.from(obj2Arr(filteredDataObjects));
	} else {
		return null;
	}
}

function makeAllowedDate(proposedValue, defaultValue, state){
	if(!proposedValue) return defaultValue;

	let maxAllowed = new Date(state.toDateMax);
	let minAllowed = new Date(state.fromDateMin);
	let date = new Date(proposedValue);

	if(date < minAllowed) return minAllowed.toISOString()
	else if(date > maxAllowed) return maxAllowed.toISOString()
	else return proposedValue;
}
