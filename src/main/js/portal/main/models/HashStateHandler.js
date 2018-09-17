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

const getStateFromStore = storeState => {
	return Object.keys(stateStructure).reduce((acc, key) => {
		acc[key] = storeState[key];
		return acc;
	}, {});
};

const simplifyState = state => {
	return Object.assign(state, {
		filterTemporal: state.filterTemporal ? state.filterTemporal.serialize : {},
		filterFreeText: state.filterFreeText.serialize,
		preview: state.preview.pids
	});
};

const jsonToState = state => {
	const stateFromHash = Object.assign({}, state);

	try {
		state.route = state.route || config.DEFAULT_ROUTE;
		state.filterCategories = state.filterCategories || {};
		state.filterTemporal = state.filterTemporal
			? new FilterTemporal().restore(state.filterTemporal)
			: new FilterTemporal();
		state.filterFreeText = state.filterFreeText === undefined
			? new FilterFreeText()
			: FilterFreeText.deserialize(state.filterFreeText);
		state.tabs = state.tabs || {};
		state.page = state.page || 0;
		state.preview = new Preview().withPids(state.preview || []);

		// const stateFromDeserialize = State.deserialize(state, {});
		console.log({stateFromHash, newState: state});
	} catch(err) {
		console.log({stateFromHash, err});
		throw new Error("Could not convert json to state");
	}

	return state;
};

const handleRoute = storeState => {
	if (storeState.route === config.ROUTE_SEARCH){
		delete storeState.route;
	}
};

const specialCases = state => {
	if (state.route === config.ROUTE_PREVIEW) {
		return {
			route: state.route,
			preview: state.preview
		};
	} else {
		delete state.preview;
	}

	if (state.route === config.ROUTE_SEARCH){
		delete state.route;
	}

	return state;
};

function getCurrentHash(){
	return decodeURIComponent(window.location.hash.substr(1));
}

const hashUpdater = store => () => {
	const newHash = stateToHash(store.getState());
	const oldHash = getCurrentHash();

	// console.log('hashUpdater', {updateHash: (newHash !== oldHash), history: history.state, newHash, oldHash});

	if (newHash !== oldHash){
		window.location.hash = newHash;
	}
};
export default hashUpdater;

const stateToHash = state => {
	const currentStoreState = getStateFromStore(state);
	const simplifiedStoreState = simplifyState(currentStoreState);
	const reducedStoreState = reduceState(simplifiedStoreState);
	handleRoute(reducedStoreState);
	const final = specialCases(reducedStoreState);
	return Object.keys(final).length ? JSON.stringify(final) : '';
};

//No # in the beginning!
const hashToState = hash => {
	try {
		const state = JSON.parse(decodeURIComponent(hash));
		return jsonToState(state);
	} catch(err) {
		return {};
	}
};

export const getStateFromHash = () => {
	return hashToState(getCurrentHash());
};

const reduceState = state => {
	return Object.keys(state).reduce((acc, key) => {

		if (Array.isArray(state[key]) && state[key].length){
			acc[key] = state[key];

		} else if (typeof state[key] === 'object') {
			const part = reduceState(state[key]);

			if (Object.keys(part).length) {
				acc[key] = part;
			}

		} else if (typeof state[key] === 'string'){
			acc[key] = state[key];

		} else if (typeof state[key] === 'number' && state[key] !== 0){
			acc[key] = state[key];
		}

		return acc;
	}, {});
};
