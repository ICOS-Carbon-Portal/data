import React, { Component } from 'react';
import {FadeIn, FadeOut} from '../Fade.jsx';

export class Toaster extends Component{
	constructor(props) {
		super(props);
	}

	render(){
		const props = this.props;
		const {header, message, className} = props.toasterData ? props.toasterData : {null, null, null};
		const divStyle = header && message && className
			? {position:'fixed', top: 15, right: 15, maxWidth:300, zIndex:9999}
			: {display:'none'};

		return(
			<div style={divStyle} className={className}>
				<span style={{position:'relative', top:-10, right:-10, float:'right', fontSize:'150%', cursor: 'pointer'}}
					  className="glyphicon glyphicon-remove-sign"
					  onClick={props.closeToast}
				/>
				<label>{header}</label>
				<div>{message}</div>
			</div>
		);
	}
}

export class AnimatedToaster extends Component{
	constructor(props){
		super(props);
		this.state = {status : "SHOW"}
	}

	componentDidMount(){
		const self = this;

		if(this.props.autoCloseDelay > 0){
			this.autoCloseTimer = setTimeout(() => {
				self.setState({status: "HIDE"});
			}, this.props.autoCloseDelay);
		}
	}

	componentWillReceiveProps(nextProps){
		console.log({nextProps});
	}

	handleInnerToasterClose(){
		clearTimeout(this.autoCloseTimer);
		this.setState({status: "HIDE"});
	}

	handleFadeOutDone(){
		if(this.props.closeToast){
			this.props.closeToast();
		}
	}

	render(){
		const props = this.props;
		const closeToast = this.handleInnerToasterClose.bind(this);
		const fadeOutDone = this.handleFadeOutDone.bind(this);

		switch(this.state.status){
			case "SHOW":
				return (
					<FadeIn fadeTime={props.fadeInTime}>
						<Toaster toasterData={props.toasterData} closeToast={closeToast}/>
					</FadeIn>
				);
			case "HIDE":
				return (
					<FadeOut fadeTime={props.fadeOutTime} onDone={fadeOutDone}>
						<Toaster toasterData={props.toasterData} closeToast={closeToast}/>
					</FadeOut>
				);
		}
	}
}
