import {PortalThunkAction} from "../store";
import {getSavedSearches, getWhoIam, saveCart, saveSearch} from "../backend";
import {SavedSearch, WhoAmI} from "../models/State";
import { BootstrapRouteSavedSearch } from "../reducers/actionpayloads";

export default function bootstrapSavedSearch(user: WhoAmI): PortalThunkAction<void> {
	return dispatch => {
		if (user.email === null )
		  return;
		else
			getSavedSearches(user.email).then((savedSearches) => {
				dispatch(new BootstrapRouteSavedSearch(savedSearches));
			});
		
	};
}

export function saveSearches(savedSearches: SavedSearch[]): PortalThunkAction<void> {
	return (dispatch, getState)=> {
		const state = getState();

		saveSearch(state.user.email, savedSearches);
		dispatch(new BootstrapRouteSavedSearch(savedSearches)); //save to the redux states
	}
}
