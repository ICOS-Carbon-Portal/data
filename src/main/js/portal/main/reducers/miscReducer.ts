import {MiscError, MiscInit, MiscPayload} from "./actionpayloads";
import stateUtils, {State} from "../models/State";
import {MiscError, MiscInit, MiscPayload, MiscUpdateSearchOption} from "./declarations";
import stateUtils, {SearchOptions, State} from "../models/State";
import * as Toaster from 'icos-cp-toaster';
import {SearchOption} from "../actions";

export default function(state: State, payload: MiscPayload): State{

	if (payload instanceof MiscInit){
		return stateUtils.update(state, stateUtils.getStateFromHash());
	}

	if (payload instanceof MiscError){
		return stateUtils.update(state, {
			toasterData: new Toaster.ToasterData(Toaster.TOAST_ERROR, payload.error.message.split('\n')[0])
		});
	}

	if (payload instanceof MiscUpdateSearchOption){
		return stateUtils.update(state, {
			searchOptions: updateSearchOptions(payload.oldSearchOptions, payload.newSearchOption)
		});
	}

	return state;

};

const updateSearchOptions = (oldSearchOptions: SearchOptions, newSearchOption: SearchOption) => {
	return Object.assign(oldSearchOptions, {[newSearchOption.name]: newSearchOption.value});
};
