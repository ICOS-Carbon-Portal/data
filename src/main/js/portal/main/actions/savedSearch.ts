import { PortalThunkAction } from "../store";
import { getSavedSearches, saveSearch } from "../backend";
import { SavedSearch, WhoAmI } from "../models/State";
import { BootstrapRouteSavedSearch, UpdateSavedSearch } from "../reducers/actionpayloads";
import { UrlStr } from "../backend/declarations";
import stateUtils from "../models/State";
import { defaultCategNames } from "../config";
import { Dict } from "../../../common/main/types";

export default function bootstrapSavedSearch(user: WhoAmI): PortalThunkAction<void> {
  return (dispatch, getState) => {
		const savedSearches = getState().savedSearches;

    if (user.email === null) 
			return;

    else if (savedSearches.length === 0)
			getSavedSearches(user.email).then(result => {
				dispatch(new BootstrapRouteSavedSearch(result));
			});

		else
			dispatch(new BootstrapRouteSavedSearch(savedSearches));
  };
}

export function addSearch(url: UrlStr): PortalThunkAction<Promise<void>> {
  return (dispatch, getState) => {
		const {user} = getState();

		if (user.email === null) return Promise.reject();

    const newSavedSearch = {
      url,
      label: getLabel(),
      ts: new Date().toISOString(),
    };

		return getSavedSearches(user.email).then(existingSavedSearches => {
			const savedSearches = combineSavedSearches(newSavedSearch, existingSavedSearches);
			return dispatch(updateSavedSearches(savedSearches));
		});
  };
}

export function updateSavedSearches(savedSearches:SavedSearch[]): PortalThunkAction<Promise<void>>{
	
	return (dispatch, getState) => {
		const {user} = getState();

		if (user.email === null) return Promise.reject();
		dispatch(new UpdateSavedSearch(savedSearches));
		return saveSearch(user.email, savedSearches);
	};
}

function combineSavedSearches(newSavedSearch:SavedSearch, existingSavedSearches:SavedSearch[]){
	const foundSearchIndex = existingSavedSearches.findIndex(ss => ss.url === newSavedSearch.url);

  if (foundSearchIndex !== -1) {
		existingSavedSearches[foundSearchIndex].ts = new Date().toISOString();

		return existingSavedSearches;
	}

	return existingSavedSearches.concat([newSavedSearch]);
	
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
// export function removeSearch(url: UrlStr): PortalThunkAction<Promise<void>> {
//   return (dispatch, getState) => {
// 		const {user} = getState();

// 		if (user.email === null) return Promise.reject();

//     const newRemovedSearch = {
//       url,
//       label: getLabel(),
//       ts: new Date().toISOString(),
//     };

// 		return getSavedSearches(user.email).then(existingSavedSearches => {
// 			const savedSearches = removeSavedSearch(newRemovedSearch, existingSavedSearches);
// 			return dispatch(updateSavedSearches(savedSearches));
// 		});
//   };
// }

// function removeSavedSearch(newSavedSearch:SavedSearch, existingSavedSearches:SavedSearch[]){
// 	const foundSearchIndex = existingSavedSearches.findIndex(ss => ss.url === newSavedSearch.url);

//   if (foundSearchIndex !== -1) {
// 		existingSavedSearches[foundSearchIndex].ts = new Date().toISOString();

// 		return existingSavedSearches;
// 	}

// 	return existingSavedSearches.slice(foundSearchIndex, 1);
// }