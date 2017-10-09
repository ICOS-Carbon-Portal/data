import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store.js';
import App from './App.jsx';
import {updateRoute} from '../actions';

const store = getStore();

export default class Root extends Component {

	componentDidMount() {
		window.addEventListener('hashchange', () => {
			store.dispatch(updateRoute());
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
