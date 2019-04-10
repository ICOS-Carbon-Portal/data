import React, { Component } from 'react';
import './SlideIn.css';

export default class SlideIn extends Component {
	constructor(props){
		super(props);

		this.state = {
			className: props.isOpen === undefined
				? 'cp-slide-in'
				: props.isOpen
					? 'cp-slide-in cp-slide-in-open'
					: 'cp-slide-in cp-slide-in-close'
		};
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.isOpen !== this.state.isOpen) {
			const className = nextProps.isOpen
				? 'cp-slide-in cp-slide-in-open'
				: 'cp-slide-in cp-slide-in-close';
			this.setState({className});
		}
	}

	render(){
		const {className} = this.state;
		const {children} = this.props;

		return (
			<div className={className}>
				{children}
			</div>
		);
	}
}
