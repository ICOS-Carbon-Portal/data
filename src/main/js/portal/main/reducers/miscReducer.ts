import {MiscError, MiscInit, MiscPayload} from "./actionpayloads";
import stateUtils, {State} from "../models/State";
import * as Toaster from 'icos-cp-toaster';

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return stateUtils.update(state, stateUtils.getStateFromHash());
	}

	if (payload instanceof MiscError){
		return stateUtils.update(state, {
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	return state;

};
