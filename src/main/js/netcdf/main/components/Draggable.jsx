import React, { Component } from 'react';
import {Events} from 'icos-cp-utils';


export default class Draggable extends Component{
	constructor(props){
		super(props);

		this.events = new Events();

		const defaultStyle = {
			position:'absolute',
			width: 580,
			zIndex: 9999,
			top: 150,
			left: 100,
			boxShadow: 'rgba(0, 0, 0, 0.85) 9px 8px 20px -18px'
		};

		this.state = {
			style: Object.assign(defaultStyle, props.style),
			isDragging: false
		};
	}

	handleStartDrag(e){
		if (e.button !== 0) return;

		this.setState({
			isDragging: true,
			offset: {
				x: e.pageX - this.state.style.left,
				y: e.pageY - this.state.style.top
			}
		});
		e.stopPropagation();
		e.preventDefault();
	}

	handleDrag(e){
		if (!this.state.isDragging) return;

		const left = e.pageX - this.state.offset.x;
		const top = e.pageY - this.state.offset.y;

		this.setState({
			style: Object.assign({}, this.state.style, {left, top})
		});
		e.stopPropagation();
		e.preventDefault();
	}

	handleStopDrag(e){
		if (!this.state.isDragging) return;

		this.setState({isDragging: false});
		e.stopPropagation();
		e.preventDefault();

		if (this.props.onStopDrag)
			this.props.onStopDrag(this.state.style);
	}

	render(){
		const {children} = this.props;
		const {style} = this.state;

		return <span ref={span => this.root = span} style={style}>{children}</span>;
	}

	componentDidMount() {
		const {initialPos, dragElementId} = this.props;
		const initPos = initialPos(this.root);
		this.setState({style: Object.assign({}, this.state.style, initPos)});

		const dragElement = document.getElementById(dragElementId) || this.root;

		dragElement.style.cursor = 'move';
		this.events.addToTarget(dragElement, 'mousedown', this.handleStartDrag.bind(this));
		this.events.add('mousemove', this.handleDrag.bind(this));
		this.events.add('mouseup', this.handleStopDrag.bind(this));
	}

	componentWillUnmount(){
		this.events.clear();
	}
}