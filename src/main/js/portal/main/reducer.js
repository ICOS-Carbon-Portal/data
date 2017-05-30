import {ERROR, SPECTABLES_FETCHED, META_QUERIED, SPEC_FILTER_UPDATED, OBJECTS_FETCHED} from './actions';
import * as Toaster from 'icos-cp-toaster';
import CompositeSpecTable from './models/CompositeSpecTable';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				event: ERROR,
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case SPECTABLES_FETCHED:
			return update({
				event: SPECTABLES_FETCHED,
				specTable: new CompositeSpecTable(action.specTables)
			});

		case META_QUERIED:
			return update({
				event: META_QUERIED,
				metadata: action.metadata
			});

		case SPEC_FILTER_UPDATED:
			return update({
				event: SPEC_FILTER_UPDATED,
				specTable: state.specTable.withFilter(action.varName, action.values)
			});

		case OBJECTS_FETCHED:
			return update({
				objectsTable: action.objectsTable
			});

		default:
			return update({event: undefined});
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
