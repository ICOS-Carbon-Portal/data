import {MiscError, MiscInit, MiscPayload} from "../actions";
import State, {getStateFromHash} from "../models/State";
import * as Toaster from 'icos-cp-toaster';

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return state.update(getStateFromHash());
	}

	if (payload instanceof MiscError){
		return state.update({
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	return state;

};
