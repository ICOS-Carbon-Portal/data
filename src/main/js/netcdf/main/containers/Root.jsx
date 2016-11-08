import 'babel-polyfill';
import React, { Component } from 'react'
import {render} from 'react-dom';
import { Provider } from 'react-redux'
import getStore from '../store.js';
import App from './App.jsx';

const store = getStore();

export default class Root extends Component {

	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}
