import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store.js';
import App from './App.jsx';
import {getHash, updateURL} from "../store";
import {hashUpdated} from "../actions";


const store = getStore();
store.subscribe(updateURL(store));

export default class Root extends Component {
	componentDidMount() {
		window.addEventListener('popstate', _ => {
			store.dispatch(hashUpdated(getHash()));
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
