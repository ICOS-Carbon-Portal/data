import {ERROR, HASH_STATE_UPDATED, BINTABLE_FETCHED, VARIABLE_Y1_SELECTED, VARIABLE_Y2_SELECTED, MAP_STATE_CHANGED} from './actions';
import * as Toaster from 'icos-cp-toaster';


const initState = {
	binTableData: {},
	mapValueIdx: undefined,
	value1Idx: undefined,
	value2Idx: undefined,
	selectOptions: [],
	radios: [],
	center: undefined,
	zoom: undefined
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case HASH_STATE_UPDATED:
			let {y1, y2, map} = action.hashState;
			const center = getCenter(action.hashState.center) || state.center;
			const zoom = Number.isInteger(action.hashState.zoom) ? action.hashState.zoom : undefined;
			let radios = [
				getRadioData(state.binTableData, y1, map === y1),
				getRadioData(state.binTableData, y2, map === y2)
			];

			return update({
				radios,
				mapValueIdx: map,
				value1Idx: y1,
				value2Idx: y2,
				center,
				zoom
			});

		case BINTABLE_FETCHED:
			y1 = state.value1Idx;
			y2 = state.value2Idx;
			map = state.mapValueIdx;


			const value1Idx = y1 !== undefined && action.binTableData.indices.data.includes(y1)
				? y1
				: action.binTableData.indices.data[action.binTableData.indices.data.length - 1];
			const value2Idx = y2 !== undefined && action.binTableData.indices.data.includes(y2)
				? y2
				: action.binTableData.indices.data[action.binTableData.indices.data.length - 2];
			const mapValueIdx = map !== undefined && action.binTableData.indices.data.includes(map)
				? map
				: value1Idx;
			radios = [
				getRadioData(action.binTableData, value1Idx, mapValueIdx === value1Idx),
				getRadioData(action.binTableData, value2Idx, mapValueIdx === value2Idx && mapValueIdx !== value1Idx)
			];

			return update({
				objId: action.objId,
				binTableData: action.binTableData,
				mapValueIdx,
				value1Idx,
				value2Idx,
				selectOptions: action.binTableData.dataColumnsInfo.map(cols => cols.label),
				radios
			});

		case VARIABLE_Y1_SELECTED:
			radios = [
				getRadioData(state.binTableData, action.value1Idx, true),
				getRadioData(state.binTableData, state.value2Idx, false)
			];

			return update({
				value1Idx: action.value1Idx,
				radios,
				mapValueIdx: action.value1Idx
			});

		case VARIABLE_Y2_SELECTED:
			radios = [
				getRadioData(state.binTableData, state.value1Idx, false),
				getRadioData(state.binTableData, action.value2Idx, true)
			];

			return update({
				value2Idx: action.value2Idx,
				radios,
				mapValueIdx: action.value2Idx
			});

		case MAP_STATE_CHANGED:
			// console.log({center: action.center, zoom: action.zoom, url: window.location});
			return update({
				center: action.center,
				zoom: action.zoom
			});

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

const getCenter = potentialCenter => {
	const isNumeric = n => !isNaN(parseFloat(n)) && isFinite(n);
	const center = potentialCenter && potentialCenter.lat && potentialCenter.lng ? potentialCenter : undefined;
	if (center === undefined) return;

	if (!isNumeric(center.lat) && isNumeric(center.lng)) return;

	return center.lat < 85.06 && center.lat > -85.06 && center.lng < 180 && center.lng > -180
		? center
		: undefined;
};

const getRadioData = (binTableData, idx, isActive) => {
	const variable = binTableData.isValidData && idx !== undefined ? binTableData.column(idx) : undefined;
	const txt = variable ? variable.label : 'Waiting for data...';

	return {txt, isActive, actionTxt: idx};
};
