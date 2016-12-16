import React, { Component } from 'react';
import {FadeIn, FadeOut} from '../Fade.jsx';

const toasterDefaultMaxWidth = 400;

export class Toaster extends Component{
	constructor(props) {
		super(props);
	}

	handleCloseToaster(){
		if(this.props.closeToast){
			this.props.closeToast();
		}
	}

	render(){
		const props = this.props;
		const {header, message, className} = props.toasterData ? props.toasterData : {null, null, null};
		const maxWidth = props.maxWidth || toasterDefaultMaxWidth;
		const divStyle = header && message && className && !props.animated
			? {position:'fixed', top: 15, right: 15, maxWidth, zIndex:9999}
			: {};

		return(
			<div style={divStyle} className={className}>
				<span style={{position:'relative', top:-10, right:-10, float:'right', fontSize:'150%', cursor: 'pointer'}}
					  className="glyphicon glyphicon-remove-sign"
					  onClick={this.handleCloseToaster.bind(this)}
				/>
				<label>{header}</label>
				<div>{message}</div>
			</div>
		);
	}
}

export class AnimatedToasters extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const maxWidth = props.maxWidth || toasterDefaultMaxWidth;

		return (
			<div style={{position:'fixed', top: 15, right: 15, maxWidth, zIndex:9999}}>{
				props.toasterData.map(toasterData => {
					return <Animate
						key={toasterData.id}
						autoCloseDelay={props.autoCloseDelay}
						fadeInTime={props.fadeInTime}
						fadeOutTime={props.fadeOutTime}
						toasterData={toasterData}
						closeToast={props.closeToast}
					/>;
				})
			}</div>
		);
	}
}

class Animate extends Component{
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

	handleInnerToasterClose(){
		clearTimeout(this.autoCloseTimer);
		this.setState({status: "HIDE"});
	}

	handleFadeOutDone(id){
		if(this.props.closeToast){
			this.props.closeToast(id);
		}
	}

	render(){
		const props = this.props;
		const closeToast = this.handleInnerToasterClose.bind(this);
		const fadeOutDone = this.handleFadeOutDone.bind(this, props.toasterData.id);

		switch(this.state.status){
			case "SHOW":
				return (
					<FadeIn fadeTime={props.fadeInTime}>
						<Toaster toasterData={props.toasterData} closeToast={closeToast} animated={true}/>
					</FadeIn>
				);
			case "HIDE":
				return (
					<FadeOut fadeTime={props.fadeOutTime} onDone={fadeOutDone}>
						<Toaster toasterData={props.toasterData} animated={true}/>
					</FadeOut>
				);
		}
	}
}
