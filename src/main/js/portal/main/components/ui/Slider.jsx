import React, { Component } from 'react';
import {debounce, Events} from 'icos-cp-utils';


const defaultIconStyle = {
	fontSize: 14,
	position: 'absolute',
	float: 'right',
	top: -35,
	right: 8,
	cursor: 'pointer',
	color: '#666',
	padding: 10
};

export default class Slider extends Component{
	constructor(props){
		super(props);

		this.rootStyle = Object.assign({position:'relative'}, props.rootStyle);
		this.iconStyle = Object.assign({}, defaultIconStyle, props.iconStyle);

		this.state = {
			isOpen: props.startCollapsed === undefined ? true : !props.startCollapsed,
			height: undefined,
			isOpening: false
		};

		this.events = new Events();
		this.handleResize = debounce(() => {
			// Trigger a rerender on resize so it adjusts height
			this.setState({height: this.state.height});
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	onClick(){
		const isOpen = !this.state.isOpen;

		this.setState({
			isOpen,
			isOpening: isOpen
		});
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		if (this.props.children !== prevProps.children) {
			this.setHeight();
		}
	}

	componentWillUnmount(){
		this.events.clear();
	}

	transitionEnded(){
		this.setState({isOpening: false});
	}

	render(){
		const state = this.state;
		const isOpen = state.isOpen;
		const isOpening = state.isOpening;
		const height = isOpen
			? this.content ? getHeight(this.content) : state.height
			: 0;
		const {children, openClsName, closedClsName, title} = this.props;
		const iconCls = isOpen
			? openClsName || 'glyphicon glyphicon-menu-up'
			: closedClsName || 'glyphicon glyphicon-menu-down';
		const baseStyle = {
			transition: 'height 0.3s ease-in-out',
			height
		};
		const contentStyle = !isOpen || isOpening
			? Object.assign({}, baseStyle, {overflow:'hidden'})
			: baseStyle;

		return (
			<div style={this.rootStyle}>
				<span className={iconCls} style={this.iconStyle} onClick={this.onClick.bind(this)} title={title} />
				<div ref={content => this.content = content} style={contentStyle}>
					{children}
				</div>
			</div>
		);
	}

	setHeight(){
		this.setState({height: getHeight(this.content)});
	}

	componentDidMount(){
		this.setHeight();

		this.events.addToTarget(this.content, "transitionend", this.transitionEnded.bind(this));
	}
}

const getHeight = content => {
	return Array.from(content.childNodes).reduce((acc, curr) => acc + curr.clientHeight, 0);
};
