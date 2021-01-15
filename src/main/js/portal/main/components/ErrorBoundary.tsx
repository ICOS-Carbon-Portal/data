import React, { Component } from 'react';

type Props = {
	failWithError: (err: Error) => void
}

type State = {
	hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State>{
	constructor(props: Props){
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