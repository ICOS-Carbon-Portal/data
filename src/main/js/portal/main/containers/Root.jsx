import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store.js';
import App from './App.jsx';
import {restoreFromHash} from '../actions';
import hashUpdater, {shouldAppLoadFromHash} from '../models/HashStateHandler';


const store = getStore();
store.subscribe(hashUpdater(store));

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('popstate', e => {
			e.preventDefault();
			if (shouldAppLoadFromHash(store)) store.dispatch(restoreFromHash());
		});
	}

	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}
