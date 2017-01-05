import React, { Component } from 'react';
import { Provider } from 'react-redux';
import getStore from '../store';
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

