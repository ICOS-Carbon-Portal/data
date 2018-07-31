import React, { Component, Fragment } from 'react';
import G from '../models/Graph';
import {debounce} from 'icos-cp-utils';


export default class Graph extends Component{
	constructor(props){
		super(props);

		this.g = undefined;
		this.canvasOverlay = undefined;
		this.graphElement = undefined;
		this.labelElement = undefined;
		this.graphMouseMove = props.graphMouseMove;

		this.handleResize = debounce(_ => {
			this.canvasOverlay.width = this.g.graph.graphDiv.clientWidth;
			this.canvasOverlay.height = this.g.graph.graphDiv.clientHeight;
		});
		window.addEventListener("resize", this.handleResize);
	}

	componentDidUpdate(prevProps){
		const {binTableData, value1Idx, value2Idx, fromMap} = this.props;

		const graph = this.g ? this.g.graph : undefined;

		if (graph === undefined && binTableData.nRows) {
			this.g = new G(
				binTableData,
				value1Idx,
				value2Idx,
				this.graphElement,
				this.labelElement,
				this.graphMouseMove
			);

			this.canvasOverlay = createCanvasOverlay(this.graphElement, this.g.graph);
			this.graphElement.firstChild.appendChild(this.canvasOverlay);
		} else if (graph && (prevProps.value1Idx !== value1Idx || prevProps.value2Idx !== value2Idx)) {
			this.g.updateGraph(value1Idx, value2Idx);
		}

		if (graph && fromMap && fromMap.dataX && fromMap.dataY){
			addMarker(this.canvasOverlay, fromMap, graph);
		} else if (graph && fromMap && fromMap.dataX === undefined && fromMap.dataY === undefined){
			hideOverlay(this.canvasOverlay);
		}
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.handleResize);
	}

	render(){
		return (
			<Fragment>
				<div ref={div => this.graphElement = div} style={{width:'100%', height:'calc(55vh - 60px)'}} />
				<div ref={div => this.labelElement = div} style={{marginTop:10}} />
			</Fragment>
		);
	}
}

const hideOverlay = (canvasOverlay) => {
	canvasOverlay.style.display = 'none';
};

const createCanvasOverlay = (graphElement, graph) => {
	const canvasOverlay = document.createElement("canvas");
	canvasOverlay.width = graph.canvas_.width;
	canvasOverlay.height = graph.canvas_.height;
	canvasOverlay.style = 'display: none; position: absolute; z-index: 99;';
	return canvasOverlay;
};

const addMarker = (canvasOverlay, fromMap, graph) => {
	canvasOverlay.style.display = 'inline';
	const ctx = canvasOverlay.getContext('2d');
	ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
	const domCoords = graph.toDomCoords(fromMap.dataX, fromMap.dataY);

	ctx.beginPath();
	ctx.moveTo(domCoords[0], 0);
	ctx.lineTo(domCoords[0], canvasOverlay.height - 20);
	ctx.lineWidth = 2;
	ctx.strokeStyle = 'red';
	ctx.stroke();
};
