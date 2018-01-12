import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store.js';
import App from './App.jsx';
import {updateRoute} from '../actions';
import {getRouteFromLocationHash} from '../utils';

const store = getStore();

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('hashchange', (e) => {
			// console.log({oldURL: e.oldURL, newURL: e.newURL, newHash: window.location.hash});
			store.dispatch(updateRoute(getRouteFromLocationHash()));
		})
	}

	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}
