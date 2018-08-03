import {ERROR, HASH_STATE_UPDATED, BINTABLE_FETCHED, VARIABLE_Y1_SELECTED, VARIABLE_Y2_SELECTED, MAP_STATE_CHANGED} from './actions';
import * as Toaster from 'icos-cp-toaster';


const initState = {
	hashState: {},
	binTableData: {},
	mapValueIdx: undefined,
	value1Idx: undefined,
	value2Idx: undefined,
	selectOptions: [],
	radios: []
};

export default function(state = initState, action){

	switch(action.type){

		case ERROR:
			return update({
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case HASH_STATE_UPDATED:
			let {y1, y2, map} = action.hashState;
			const center = getCenter(action.hashState.center);
			const zoom = Number.isInteger(action.hashState.zoom) ? action.hashState.zoom : undefined;

			let hashState = getHashState(y1, y2, map, center, zoom);

			return update({
				hashState
			});

		case BINTABLE_FETCHED:
			y1 = state.hashState.y1;
			y2 = state.hashState.y2;
			map = state.hashState.map;


			const value1Idx = y1 !== undefined && action.binTableData.indices.data.includes(y1)
				? y1
				: action.binTableData.indices.data[action.binTableData.indices.data.length - 1];
			const value2Idx = y2 !== undefined && action.binTableData.indices.data.includes(y2)
				? y2
				: action.binTableData.indices.data[action.binTableData.indices.data.length - 2];
			const mapValueIdx = map !== undefined && action.binTableData.indices.data.includes(map)
				? map
				: value1Idx;
			let radios = [
				getRadioData(action.binTableData, value1Idx, mapValueIdx === value1Idx),
				getRadioData(action.binTableData, value2Idx, mapValueIdx === value2Idx)
			];
			hashState = updateHashState(value1Idx, value2Idx, mapValueIdx, state.center, state.zoom);

			return update({
				binTableData: action.binTableData,
				mapValueIdx,
				value1Idx,
				value2Idx,
				selectOptions: action.binTableData.dataColumnsInfo.map(cols => cols.label),
				radios,
				hashState
			});

		case VARIABLE_Y1_SELECTED:
			radios = [
				getRadioData(state.binTableData, action.value1Idx, true),
				getRadioData(state.binTableData, state.value2Idx, false)
			];

			hashState = updateHashState(action.value1Idx, state.value2Idx, action.value1Idx, state.center, state.zoom);

			return update({
				value1Idx: action.value1Idx,
				radios,
				mapValueIdx: action.value1Idx,
				hashState
			});

		case VARIABLE_Y2_SELECTED:
			radios = [
				getRadioData(state.binTableData, state.value1Idx, false),
				getRadioData(state.binTableData, action.value2Idx, true)
			];

			updateHashState(state.value1Idx, action.value2Idx, action.value2Idx, state.center, state.zoom);

			return update({
				value2Idx: action.value2Idx,
				radios,
				mapValueIdx: action.value2Idx
			});

		case MAP_STATE_CHANGED:
			hashState = updateHashState(state.value1Idx, state.value2Idx, state.mapValueIdx, action.center, action.zoom);

			return update({
				hashState
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

const updateHashState = (value1Idx, value2Idx, map, center, zoom) => {
	return updateUrl(getHashState(value1Idx, value2Idx, map, center, zoom));
};

const getHashState = (value1Idx, value2Idx, map, center, zoom) => {
	return {
		y1: value1Idx,
		y2: value2Idx,
		map,
		center,
		zoom
	};
};

const updateUrl = hashState => {
	window.location.hash = JSON.stringify(hashState);
	return hashState;
};

const getRadioData = (binTableData, idx, isActive) => {
	const variable = binTableData.isValidData && idx !== undefined ? binTableData.column(idx) : undefined;
	const txt = variable ? variable.label : 'Waiting for data...';

	return {txt, isActive, actionTxt: idx};
};
