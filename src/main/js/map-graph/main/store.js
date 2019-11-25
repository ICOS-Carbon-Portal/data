import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {failWithError, init} from './actions';
import deepEqual from "deep-equal";
import {saveToRestheart} from "../../common/main/backend";


const objId = window.location.pathname.split('/').pop();

export const getHash = () => {
	const hash = window.location.hash.substr(1);
	let hashState;

	try {
		hashState = JSON.parse(decodeURIComponent(hash));
	} catch(err) {
		hashState = {};
	}

	return hashState;
};

export const updateURL = store => () => {
	const state = store.getState();
	const prevState = state.prevState;
	const newHash = {
		objId: state.objId,
		y1: state.value1Idx,
		y2: state.value2Idx,
		map: state.mapValueIdx,
		center: state.center,
		zoom: state.zoom
	};
	const hasVals =  Object.keys(newHash).reduce((acc, key) => {
		return newHash[key] === undefined ? acc : acc + 1;
	}, 0) > 0;

	if (hasVals && !deepEqual(prevState, newHash)) {

		if (prevState.y1 !== newHash.y1 || prevState.y2 !== newHash.y2 || prevState.map !== newHash.map) {
			if(state.binTableData.columnsInfo){
				const labels = state.binTableData.columnsInfo.map(ci => ci.label);
				saveToRestheart({
					previewMapGraph: Object.assign({}, newHash, {
						y1: labels[newHash.y1],
						y2: labels[newHash.y2],
						map: labels[newHash.map],
					})
				});
			}
		}

		const newURL = location.origin + location.pathname + '#' + JSON.stringify(newHash);

		if (window.frameElement) {
			//Let calling page (through iframe) know what current url is
			window.top.postMessage(newURL, '*');
		} else {
			history.pushState({urlPath: newURL}, "", newURL);
		}
	}
};

export default function() {
	const store = createStore(reducer, undefined, applyMiddleware(thunkMiddleware));

	if (objId) {
		store.dispatch(init(objId, getHash()));
	} else {
		store.dispatch(failWithError({message: 'You must supply an object id'}));
	}

	return store;
}
