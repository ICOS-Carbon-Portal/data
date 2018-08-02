import {ERROR, BINTABLE_FETCHED, VARIABLE_SELECTED} from './actions';
import * as Toaster from 'icos-cp-toaster';


const initState = {
	binTableData: {},
	mapValueIdx: undefined,
	axel: undefined,
	value1Idx: undefined,
	value2Idx: undefined,
	selectOptions: []
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

			return update({
				binTableData: action.binTableData,
				mapValueIdx: value1Idx,
				axel: 'y1',
				value1Idx,
				value2Idx,
				selectOptions: action.binTableData.dataColumnsInfo.map(cols => cols.label)
			});

		case VARIABLE_SELECTED:
			const newPartialState = action.axel === 'y1'
				? {value1Idx: action.valueIdx, axel: 'y1'}
				: {value2Idx: action.valueIdx, axel: 'y2'};

			return update(Object.assign(newPartialState, {mapValueIdx: action.valueIdx}));

		default:
			return state;
	}

	function update() {
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
