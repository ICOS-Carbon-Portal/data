import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store'
import App from './App.jsx'
import {routeUpdated} from '../actions'

const store = getStore();

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('hashchange', () => {
			store.dispatch(routeUpdated());
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
