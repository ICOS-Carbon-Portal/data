import {ERROR, META_QUERIED} from './actions';
import * as Toaster from 'icos-cp-toaster';

export default function(state, action){

	switch(action.type){

		case ERROR:
			return update({
				event: ERROR,
				toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, action.error.message.split('\n')[0])
			});

		case META_QUERIED:
			return update({
				event: META_QUERIED,
				metadata: action.metadata
			});

		default:
			return update({event: undefined});
	}

	function update(){
		const updates = Array.from(arguments);
		return Object.assign.apply(Object, [{}, state].concat(updates));
	}
}
