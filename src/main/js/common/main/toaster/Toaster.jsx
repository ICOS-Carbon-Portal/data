import React, { Component } from 'react';
import ReactDOM from 'react-dom';

export default class Toaster extends Component{
	constructor(props) {
		super(props);
		this.app = {
			toastVisible: false,
			toastTimer: null
		};
	}

	componentDidUpdate(){
		if (this.props.toasterData) {
			const element = ReactDOM.findDOMNode(this.refs.container);

			if (this.app.toastVisible){
				clearTimeout(this.app.toastTimer);
				this.setTimer(element);
			} else {
				this.fadeIn(element);
			}
		}
	}

	closeClick() {
		const container = ReactDOM.findDOMNode(this.refs.container);
		this.fadeOut(container);
	}

	fadeIn(element){
		this.app.toastVisible = true;
		var opacity = 0.1;
		element.style.opacity = opacity;
		element.style.display = 'inline';

		const timer = setInterval(() => {
			if (opacity >= 1){
				clearInterval(timer);
				this.setTimer(element);
			}
			element.style.opacity = opacity;
			opacity += opacity * 0.1;
		}, 5);
	}

	setTimer(element){
		this.app.toastTimer = setTimeout(() => {
			this.fadeOut(element);
		}, this.props.msTimeout);
	}

	fadeOut(element){
		if (this.app.toastTimer) clearTimeout(this.app.toastTimer);
		var opacity = 1;

		const timer = setInterval(() => {
			if (opacity <= 0.1){
				clearInterval(timer);
				element.style.display = 'none';
				this.app.toastVisible = false;
				this.props.resetToast();
			}
			element.style.opacity = opacity;
			opacity -= opacity * 0.1;
		}, 15);
	}

	render(){
		const props = this.props;
		const header = props.toasterData ? props.toasterData.header : null;
		const message = props.toasterData ? props.toasterData.message : null;
		const className = props.toasterData ? props.toasterData.className : null;

		return(
			<div ref="container" style={{display:'none'}}>
				<div style={{position:'fixed', top: 15, right: 15, maxWidth:300, zIndex:9999}} className={className}>
					<span style={{position:'relative', top:-10, right:-10, float:'right', fontSize:'150%', cursor: 'pointer'}}
						  className="glyphicon glyphicon-remove-sign"
						  onClick={this.closeClick.bind(this)}
					/>
					<label ref="header">{header}</label>
					<div ref="message">{message}</div>
				</div>
			</div>
		);
	}
}