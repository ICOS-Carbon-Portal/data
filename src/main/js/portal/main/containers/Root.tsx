import React, {Component} from "react";
import {Provider} from "react-redux";
import getStore from "../store";
import stateUtils, {portalHistoryState} from "../models/State";
import {restoreFromHistory} from "../actions/common";
import App from "./App";

const store = getStore();
store.subscribe(stateUtils.hashUpdater(store));

export default class Root extends Component {
	componentDidMount() {
		globalThis.addEventListener("popstate", _ => {
			if (history.state) {
				portalHistoryState.getState().catch(error => console.error(error)).then(stateInIndexedDB => {
					if (stateInIndexedDB !== undefined) {
						store.dispatch(restoreFromHistory(stateInIndexedDB));
					}
				});
			} else {
				portalHistoryState.replaceState(stateUtils.serialize(store.getState()), globalThis.location.href).catch(error => console.error(error)).then(_ => _);
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
