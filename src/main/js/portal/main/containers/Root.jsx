import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store';
import App from './App.jsx';
import {restoreFromHistory} from '../actions';
import stateUtils from '../models/State';


const store = getStore();
store.subscribe(stateUtils.hashUpdater(store));

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('popstate', _ => {
			if (history.state) {
				store.dispatch(restoreFromHistory(history.state));
			} else {
				history.replaceState(stateUtils.serialize(store.getState()), null, window.location);
			}
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
