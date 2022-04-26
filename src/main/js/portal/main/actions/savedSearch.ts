import { PortalThunkAction } from "../store";
import { getSavedSearches, saveSearch } from "../backend";
import { SavedSearch, WhoAmI } from "../models/State";
import { BootstrapRouteSavedSearch } from "../reducers/actionpayloads";
import { UrlStr } from "../backend/declarations";
import stateUtils from "../models/State";
import { defaultCategNames } from "../config";
import { Dict } from "../../../common/main/types";

export default function bootstrapSavedSearch(user: WhoAmI): PortalThunkAction<void> {
  return (dispatch) => {
    if (user.email === null) return;
    else
      getSavedSearches(user.email).then((savedSearches) => {
        dispatch(new BootstrapRouteSavedSearch(savedSearches));
      });
  };
}

export function saveSearches(savedSearches: SavedSearch[]): PortalThunkAction<Promise<void>> {
  return (dispatch, getState) => {
    const state = getState();

    return saveSearch(state.user.email, savedSearches).then(() => Promise.resolve());
  };
}

export function addSearch(url: UrlStr): PortalThunkAction<Promise<void>> {
  return (dispatch, getState) => {
    const newSavedSearch = {
      url,
      label: getLabel(url),
      ts: Date.now(),
    };

    return dispatch(saveSearches(getState().savedSearches.concat([newSavedSearch]))).then(_ => Promise.resolve());
  };

}

function getLabel(url: UrlStr): string{
  const hash = stateUtils.hashToState() as Dict;

  if ("filterCategories" in hash) {
    return Object.keys(hash.filterCategories)
      .map((key) => (defaultCategNames as Dict)[key])
      .join(", ");
  }

  return "Saved Search";
}
