import React, { Component, ReactNode } from 'react';
import { AppProps } from '../containers/App';

type OurProps = Pick<AppProps, 'failWithError'> & { children: ReactNode }
type OurState = {
	hasError: boolean
}

export default class ErrorBoundary extends Component<OurProps, OurState>{
	constructor(props: OurProps){
		super(props);

		this.state = {
			hasError: false
		};
	}

	componentDidCatch(error: Error) {
		this.setState({hasError: true});
		if (this.props.failWithError) this.props.failWithError(error);
	}

	render() {
		if (this.state.hasError) {
			return <h4>An error occurred</h4>;
		}

		return this.props.children;
	}
}