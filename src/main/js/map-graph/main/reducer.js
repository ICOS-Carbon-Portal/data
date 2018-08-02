import {ERROR, BINTABLE_FETCHED, VARIABLE_Y1_SELECTED, VARIABLE_Y2_SELECTED} from './actions';
import * as Toaster from 'icos-cp-toaster';


const initState = {
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

		case BINTABLE_FETCHED:
			const value1Idx = action.binTableData.indices.data[action.binTableData.indices.data.length - 1];
			const value2Idx = action.binTableData.indices.data[action.binTableData.indices.data.length - 2];
			let radios = [
				getRadioData(action.binTableData, value1Idx, true),
				getRadioData(action.binTableData, value2Idx, false)
			];

			return update({
				binTableData: action.binTableData,
				mapValueIdx: value1Idx,
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

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}

const getRadioData = (binTableData, idx, isActive) => {
	const variable = binTableData.isValidData && idx !== undefined ? binTableData.column(idx) : undefined;
	const txt = variable ? variable.label : 'Waiting for data...';
	const actionTxt = idx;

	return {txt, isActive, actionTxt};
};
