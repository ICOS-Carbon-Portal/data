import deepEqual from 'deep-equal';
import config from "../config";
import FilterTemporal from "./FilterTemporal";
import FilterFreeText from "./FilterFreeText";
import Preview from "./Preview";


const stateStructure = {
	route: undefined,
	filterCategories: undefined,
	filterTemporal: undefined,
	filterFreeText: undefined,
	tabs: undefined,
	page: undefined,
	preview: undefined
};

const getStateFomHash = () => {
	const hash = window.location.hash.substr(1);
	let hashState;

	try {
		hashState = JSON.parse(decodeURIComponent(hash));
	} catch(err) {
		hashState = {};
	}

	return hashState;
};

const getStateFromStore = storeState => {
	return Object.keys(stateStructure).reduce((acc, key) => {
		acc[key] = storeState[key];
		return acc;
	}, {});
};

const simplifyState = state => {
	return Object.assign(state, {
		filterTemporal: state.filterTemporal ? state.filterTemporal.summary : {},
		filterFreeText: state.filterFreeText.summary,
		preview: state.preview.summary
	});
};

const extendState = state => {
	state.route = state.route || config.DEFAULT_ROUTE;
	state.filterCategories = state.filterCategories || {};
	state.filterTemporal = state.filterTemporal
		? new FilterTemporal().restore(state.filterTemporal)
		: new FilterTemporal();
	state.filterFreeText = new FilterFreeText().restore(state.filterFreeText);
	state.tabs = state.tabs || {};
	state.page = state.page || 0;
	state.preview = new Preview().withPids(state.preview || []);

	return state;
};

const specialCases = state => {
	if (state.route !== config.ROUTE_PREVIEW) delete state.preview;

	return state;
};

const hashUpdater = store => () => {
	const {hashState, storeState} = getStates(store);
	const newHash = deepEqual(hashState, storeState) ? undefined : storeState;

	if (newHash) {
		window.location.hash = JSON.stringify(specialCases(newHash));
	}

};
export default hashUpdater;

export const shouldAppLoadFromHash = store => {
	const {hashState, storeState} = getStates(store);
	return !deepEqual(hashState, storeState);
};

const getStates = store => {
	const state = store.getState();
	const currentHash = getStateFomHash();
	const currentStoreState = getStateFromStore(state);
	const simplifiedStoreState = simplifyState(currentStoreState);
	const reducedStoreState = reduceHashState(simplifiedStoreState);

	return {
		hashState: currentHash,
		storeState: reducedStoreState
	};
};

export const hash2State = () => {
	return extendState(getStateFomHash());
};

const reduceHashState = hashState => {
	return Object.keys(hashState).reduce((acc, key) => {

		if (Array.isArray(hashState[key]) && hashState[key].length){
			acc[key] = hashState[key];

		} else if (typeof hashState[key] === 'object') {
			const part = reduceHashState(hashState[key]);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (typeof hashState[key] === 'string'){
			acc[key] = hashState[key];

		} else if (typeof hashState[key] === 'number' && hashState[key] !== 0){
			acc[key] = hashState[key];
		}

		return acc;
	}, {});
};
