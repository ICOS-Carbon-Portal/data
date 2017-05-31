import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {throttle} from 'icos-cp-utils';

export default class ScreenHeightColumn extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount(){
		this.ensureScreenHeight();
		this.resizeListener = throttle(this.ensureScreenHeight.bind(this), 200);
		window.addEventListener("resize", this.resizeListener);
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.resizeListener);
	}

	ensureScreenHeight(){
		const listElem = ReactDOM.findDOMNode(this);

		const listRect = listElem.getBoundingClientRect();
		const panelRect = listElem.parentElement.parentElement.getBoundingClientRect();

		const totalMargin = panelRect.height - listRect.height;

		const desiredHeight = window.innerHeight - totalMargin - 10;

		listElem.style['max-height'] = desiredHeight + "px";
	}

	render(){
		return <div className={this.props.className} style={{overflowY: "auto", overflowX: "hidden"}}>
			{this.props.children}
		</div>;
	}
}

