import { PortalThunkAction } from "../store";
import { getSavedSearches, saveSearch } from "../backend";
import { SavedSearch, WhoAmI } from "../models/State";
import { BootstrapRouteSavedSearch, PortalPlainAction } from "../reducers/actionpayloads";
import { UrlStr } from "../backend/declarations";
import stateUtils from "../models/State";
import { defaultCategNames } from "../config";
import { Dict } from "../../../common/main/types";

export default function bootstrapSavedSearch(user: WhoAmI): PortalThunkAction<void> {
  return (dispatch) => {
    if (user.email === null) 
			return;
    else
      dispatch(fetchSavedSearches(user.email));
  };
}

function fetchSavedSearches(email: string): PortalThunkAction<Promise<SavedSearch[]>> {
  return (dispatch) => {
    return getSavedSearches(email).then(result => {
			dispatch(new BootstrapRouteSavedSearch(result));
			return result;
		});
	}
}

export function saveSearches(savedSearches: SavedSearch[]): PortalThunkAction<Promise<void>> {
  return (dispatch, getState) => {
    return saveSearch(getState().user.email, savedSearches);
  };
}
export function addSearch(url: UrlStr): PortalThunkAction<Promise<void>> {
  return (dispatch, getState) => {
		const {user} = getState();

		if (user.email === null) return Promise.reject();

    const newSavedSearch = {
      url,
      label: getLabel(),
      ts: Date.now(),
    };

		return dispatch(fetchSavedSearches(user.email)).then(savedSearches => {
			saveSearch(user.email, combineSavedSearches(newSavedSearch, savedSearches));
		});
  };
}

function combineSavedSearches(newSavedSearch:SavedSearch, existingSavedSearches:SavedSearch[]){
	const foundSearch = existingSavedSearches.find(ss => ss.url = newSavedSearch.url); 
  if (foundSearch) {
		foundSearch.ts = Date.now();
		return existingSavedSearches;

	} else {
		return existingSavedSearches.concat([newSavedSearch]);
	}
} 

function getLabel(): string{
  const hash = stateUtils.hashToState() as Dict;

  if ("filterCategories" in hash) {
    return Object.keys(hash.filterCategories)
      .map((key) => (defaultCategNames as Dict)[key])
      .join(", ");
  }

  return "Saved Search";
}
