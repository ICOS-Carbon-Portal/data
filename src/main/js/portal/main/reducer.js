import { ROUTE_UPDATED, FROM_DATE_SET, TO_DATE_SET, FILTER_UPDATED, GOT_GLOBAL_TIME_INTERVAL, GOT_PROP_VAL_COUNTS,
	FETCHING_META, FETCHING_DATA, FETCHED_META, FETCHED_DATA, DATA_CHOSEN, ERROR} from './actions';
import {addDataObject} from './models/chartDataMaker';

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

		case FETCHED_DATA:
			return (state.dataObjectId === action.dataObjId)
				? Object.assign({}, state, {
					status: FETCHED_DATA,
					format: action.format,
					metaData: getMetaData(action.format, action.dataObjId),
					chart: addDataObject(state.chart, action.dataObjId, action.binTable, state.tableFormat)
				})
				: state; //ignore the fetched data obj if another one got chosen while fetching

		case DATA_CHOSEN:
			return Object.assign({}, state, {dataObjectId: action.dataObjectId});

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
			return (
				state.objectSpecification === action.objectSpecification &&
				state.fromDate === action.fromDate &&
				state.toDate === action.toDate
			)
				? Object.assign({}, state, {
					propValueCounts: action.propsAndVals.propValCount,
					filteredDataObjects: filteredDO2Arr(action.propsAndVals.filteredDataObjects)
				})
				: state;

		default:
			return state;
	}

}

function getMetaData(format, dataObjectId){
	let geom = {
		lat: null,
		lon: null
	};

	let newFormat = [{label: "LANDING PAGE", value: dataObjectId}];

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

function filteredDO2Arr(filteredDataObjects){
	if (filteredDataObjects){
		function* obj2Arr(obj) {
			for (let prop of Object.keys(obj))
				yield {
					id: prop,
					fileName: obj[prop][0].value,
					nRows: obj[prop][0].count
				};
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
