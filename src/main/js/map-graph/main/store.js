import 'babel-polyfill';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import reducer from './reducer';
import {failWithError, init} from './actions';
import deepEqual from "deep-equal";


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
	const currentHash = getHash();
	const newHash = {
		y1: state.value1Idx,
		y2: state.value2Idx,
		map: state.mapValueIdx,
		center: state.center,
		zoom: state.zoom
	};
	const hasVals =  Object.keys(newHash).reduce((acc, key) => {
		return newHash[key] === undefined ? acc : acc + 1;
	}, 0) > 0;

	if (hasVals && !deepEqual(currentHash, newHash)) {
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
