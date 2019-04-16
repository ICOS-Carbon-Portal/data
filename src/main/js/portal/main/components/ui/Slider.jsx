import React, { Component } from 'react';


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
			height: undefined
		};
	}

	onClick(){
		this.setState({isOpen: !this.state.isOpen});
	}

	render(){
		const state = this.state;
		const isOpen = state.isOpen;
		const height = isOpen ? state.height : 0;
		const {children, openClsName, closedClsName, title} = this.props;
		const iconCls = isOpen
			? openClsName || 'glyphicon glyphicon-menu-up'
			: closedClsName || 'glyphicon glyphicon-menu-down';
		const contentStyle = {
			transition: 'height 0.3s ease-in-out',
			overflow: 'hidden',
			height
		};

		return (
			<div style={this.rootStyle}>
				<span className={iconCls} style={this.iconStyle} onClick={this.onClick.bind(this)} title={title} />
				<div ref={content => this.content = content} className={'cp-slider'} style={contentStyle}>
					{children}
				</div>
			</div>
		);
	}

	componentDidMount(){
		const height = Array.from(this.content.childNodes).reduce((acc, curr) => acc + curr.clientHeight, 0);
		this.setState({height});
	}
}
