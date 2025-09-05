import React, { Component, ReactNode } from 'react';
import store from '../store';
import { failWithError } from '../actions';

type OurProps = {
	children: ReactNode
};

type OurState = {
	hasError: boolean
	error?: Error
};

export default class ErrorBoundary extends Component<OurProps, OurState> {
	constructor(props: OurProps){
		super(props);

		this.state = {
			hasError: false
		};
	}
	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error) {
		store.dispatch(failWithError(error));
	}

	render() {
		if (this.state.hasError) {
			return <h4>An error occurred</h4>;
		}

		return this.props.children;
	}
}
