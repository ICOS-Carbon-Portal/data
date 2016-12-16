import React, { Component } from 'react';

export class FadeIn extends Component{
	constructor(props) {
		super(props);
		this.state = {
			opacity: 0
		};
	}

	componentWillMount(){
		const self = this;
		const fadeTime = this.props.fadeTime ? this.props.fadeTime / 10 : 10;

		const interval = setInterval(() => {
			let newOpacity = self.state.opacity + 0.1;
			newOpacity = newOpacity > 1 ? 1 : newOpacity;

			if(newOpacity == 1) {
				clearInterval(interval);

				if(self.props.onDone){
					self.props.onDone();
				}
			}

			self.setState({opacity: newOpacity});

		}, fadeTime);
	}

	render(){
		return (
			<div style={{opacity: this.state.opacity}}>{this.props.children}</div>
		);
	}
}

export class FadeOut extends Component{
	constructor(props) {
		super(props);
		this.state = {
			opacity: 1
		};
	}

	componentWillMount(){
		const self = this;
		const fadeTime = this.props.fadeTime ? this.props.fadeTime / 10 : 40;

		const interval = setInterval(() => {
			let newOpacity = self.state.opacity - 0.1;
			newOpacity = newOpacity < 0 ? 0 : newOpacity;

			if (newOpacity == 0) {
				clearInterval(interval);

				if (self.props.onDone) {
					self.props.onDone();
				}
			} else {
				self.setState({opacity: newOpacity});
			}
		}, fadeTime);
	}

	render(){
		return (
			<div style={{opacity: this.state.opacity}}>{this.props.children}</div>
		);
	}
}