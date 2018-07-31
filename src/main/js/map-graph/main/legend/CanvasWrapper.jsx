import React, { Component } from 'react';


export default class CanvasWrapper extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount(){
		this.renderCanvas(this.props.canvas);
	}

	componentDidUpdate(){
		this.renderCanvas(this.props.canvas);
	}

	renderCanvas(canvas){
		if (canvas) {
			const ctx = this.canvasElement.getContext('2d');
			ctx.drawImage(canvas, 0, 0);
		}
	}

	render(){
		return <canvas ref={el => this.canvasElement = el} style={this.props.style} />;
	}
}