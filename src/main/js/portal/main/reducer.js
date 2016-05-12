import { ROUTE_UPDATED, FROM_DATE_SET, TO_DATE_SET, FILTER_UPDATED, GOT_GLOBAL_TIME_INTERVAL, GOT_PROP_VAL_COUNTS,
	FETCHING_META, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, REMOVE_DATA, PIN_DATA, ERROR} from './actions';
import {generateChartData} from './models/chartDataMaker';

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

		case PIN_DATA:
			return Object.assign({}, state, {
				status: PIN_DATA,
				dataObjects: updateDataObjects(state.dataObjects, action.dataObjectInfo.id, 'pinned')
			});

		case FETCHED_DATA:
			if (state.dataObjId === action.dataObjId){
				const dataObjects = updateDataObjects(state.dataObjects, action.dataObjId, 'view', action.format, action.binTable);

				return Object.assign({}, state, {
					status: FETCHED_DATA,
					dataObjects,
					forChart: generateChartData(dataObjects),
					forMap: {
						geoms: getMapData(dataObjects)
					},
					format: action.format,
					// metaData: getMetaData(action.format, action.dataObjId),
					// multipleDO: addDataObject(state.multipleDO, action.dataObjId, action.binTable, action.format, state.filteredDataObjects)
				});
			} else {
				return state;
			}

		case DATA_CHOSEN:
			return Object.assign({}, state, {dataObjId: action.dataObjId});
		
		case REMOVE_DATA:
			const dataObjects = updateDataObjects(state.dataObjects, action.dataObjId, 'view');

			return Object.assign({}, state, {
				status: REMOVE_DATA,
				dataObjects,
				forChart: generateChartData(dataObjects),
				forMap: {
					geoms: getMapData(dataObjects)
				},
				format: state.format,
				// metaData: state.metaData,
				// multipleDO: removeDataObject(state.multipleDO, action.dataObjId, state.format)
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
				const filteredDataObjects = filteredDO2Arr(action.propsAndVals.filteredDataObjects, state.filteredDataObjects, state.dataObjects);

				return Object.assign({}, state, {
					propValueCounts: action.propsAndVals.propValCount,
					filteredDataObjects,
					dataObjects: loadDataObjects(state.dataObjects, filteredDataObjects)
				});
			} else {
				return state;
			}

		default:
			return state;
	}

}

function getMapData(dataObjects){
	const newGeoms = dataObjects.filter(dob => dob.view).map(dob => {
		return {
			id: dob.id,
			lat: dob.metaData.geom.lat,
			lon: dob.metaData.geom.lon
		}
	});

	console.log({dataObjects, newGeoms});
	return newGeoms;
}

// function getMapData(oldGeoms, dataObjId, format){
// 	let newGeoms = oldGeoms.slice(0);
//
// 	let geom = {
// 		id: dataObjId,
// 		lat: null,
// 		lon: null
// 	};
//
// 	format.forEach(obj => {
// 		if (obj.label === 'LATITUDE'){
// 			geom.lat = obj.value;
// 		} else if (obj.label === 'LONGITUDE'){
// 			geom.lon = obj.value;
// 		}
// 	});
//
// 	newGeoms.push(geom);
// 	return newGeoms;
// }

function loadDataObjects(dataObjects, filteredDataObjects){
	// console.log({dataObjects, filteredDataObjects});
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
	// console.log({dataObjects, dataObjId, prop});
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
		if (obj.label === 'LATITUDE'){
			geom.lat = obj.value;
		} else if (obj.label === 'LONGITUDE'){
			geom.lon = obj.value;
		} else {
			newFormat.push(obj);
		}
	});

	return {geom, format: newFormat};
}

function filteredDO2Arr(filteredDataObjects, oldFilteredDataObjects, dataObjects){

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
