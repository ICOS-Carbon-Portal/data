import React, { Component } from 'react';

const defaultIconStyle = {
	fontSize:28,
	position:'absolute',
	float:'right',
	top:-33,
	right:3,
	cursor:'pointer'
};
const defaultDeltaStep = 6;

export default class Slider extends Component{
	constructor(props){
		super(props);

		this.iconsStyle = Object.assign(defaultIconStyle, props.iconsStyle);
		this.deltaStep = props.deltaStep || defaultDeltaStep;

		this.state = {
			forceCollapse: props.startCollapsed || false,
			direction: undefined,
			defaultHeight: undefined,
			height: undefined
		};

		this.timers = [];
	}

	componentDidMount(){
		this.setState({
			defaultHeight: this.content.clientHeight,
			height: this.state.forceCollapse ? 0 : this.content.clientHeight
		});
	}

	onClick(){
		this.timers.forEach(t => clearTimeout(t));
		this.timers = [];

		const content = this.content;
		const direction = this.state.direction;
		const height = content.clientHeight;
		const newDirection = (direction === undefined && height > 0) || direction === 'expand'
			? 'collapse'
			: 'expand';

		this.setState({
			direction: newDirection,
			height: height + getDelta(newDirection, this.deltaStep)
		});
	}

	render(){
		const {height, direction} = this.state;
		const style = getStyle(this.state);
		const iconCls = height === 0 || direction === 'collapse'
			? 'glyphicon glyphicon-collapse-down'
			: 'glyphicon glyphicon-collapse-up';
		const {children} = this.props;

		return (
			<div style={{position:'relative'}}>
				<span className={iconCls} style={this.iconsStyle} onClick={this.onClick.bind(this)} />
				<div ref={content => this.content = content} style={style}>
					{children}
				</div>
			</div>
		);
	}

	componentDidUpdate(){
		const {height, direction, defaultHeight} = this.state;

		if (direction === undefined || height === undefined) return;
		if (height <= 0) {
			this.setState({direction: undefined, height: 0});
			return;
		}
		if (height >= defaultHeight) {
			this.setState({direction: undefined, height: defaultHeight});
			return;
		}

		const newHeight = this.content.clientHeight + getDelta(direction, this.deltaStep);
		const self = this;
		this.timers.push(setTimeout(() => self.setState({height: newHeight}), 1));
	}
}

const getDelta = (direction, deltaStep) => {
	return direction === 'collapse' ? -deltaStep : deltaStep;
};

const getStyle = state => {
	const {height, defaultHeight} = state;

	if (height === undefined) return {};

	const opacity = height > 100 ? 1 : (height / 100);
	return height === defaultHeight
		? {height, overflow: 'visible', opacity, padding: 0}
		: {height, overflow: 'hidden', opacity, padding: 0};
};
