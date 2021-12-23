import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store';
import App from './App';
import stateUtils, {portalHistoryState} from '../models/State';
import {restoreFromHistory} from "../actions/common";

const store = getStore();
store.subscribe(stateUtils.hashUpdater(store));

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('popstate', _ => {

			if (history.state) {
				portalHistoryState.getState().then(
					stateInIndexedDB => {
						if (stateInIndexedDB !== undefined)
							store.dispatch(restoreFromHistory(stateInIndexedDB));
					},
					reason => console.error(reason)
				);

			} else {
				portalHistoryState.replaceState(stateUtils.serialize(store.getState()), window.location.href).then(
					_ => _,
					reason => console.error(reason)
				);
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
