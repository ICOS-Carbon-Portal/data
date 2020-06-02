import React, { Component, Fragment } from 'react';
import Dropdown from '../components/Dropdown.jsx';
import G from '../models/Graph';
import {debounce, Events} from 'icos-cp-utils';

const errorStyle = {
	display: 'none',
	width:'99%',
	height:'calc(55vh - 60px)',
	fontSize: '120%',
	alignItems: 'center',
	justifyContent: 'center',
	position: 'absolute',
	flexDirection: 'column'
};

export default class GraphContainer extends Component{
	constructor(props){
		super(props);

		this.g = undefined;
		this.canvasOverlay = undefined;
		this.graphElement = undefined;
		this.errorElement = undefined;
		this.labelElement = undefined;
		this.graphMouseMove = props.graphMouseMove;
		this.events = new Events();

		this.handleResize = debounce(_ => {
			if (this.g === undefined) return;

			this.canvasOverlay.width = this.g.graph.graphDiv.clientWidth;
			this.canvasOverlay.height = this.g.graph.graphDiv.clientHeight;
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	componentDidUpdate(prevProps){
		const {binTableData, value1Idx, value2Idx, fromMap, pointReducer} = this.props;

		if (pointReducer && pointReducer.pointCount === 0) {
			const label = binTableData.columnsInfo[pointReducer.valueIdx].label;
			this.graphElement.style.display = 'none';
			this.errorElement.style.display = 'flex';
			this.errorElement.innerHTML = `<b>${label}</b><div>This variable contains no data. Please select another variable.</div>`;
			return;

		} else {
			this.graphElement.style.display = 'block';
			this.errorElement.style.display = 'none';
		}

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

		} else if (graph && pointReducer && prevProps.pointReducer && prevProps.pointReducer.pointCount === 0 && pointReducer.pointCount > 0) {
			this.g.updateGraph(value1Idx, value2Idx);
		}

		if (graph && fromMap && fromMap.dataX && fromMap.dataY){
			addMarker(this.canvasOverlay, fromMap, graph);
		} else if (graph && fromMap && fromMap.dataX === undefined && fromMap.dataY === undefined){
			hideOverlay(this.canvasOverlay);
		}
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const {binTableData, value1Idx, value2Idx, selectVarY1, selectVarY2, selectOptions, graphMouseOut} = this.props;
		const selectedItem1Key = binTableData.valueIdx2DataIdx ? binTableData.valueIdx2DataIdx(value1Idx) : undefined;
		const selectedItem2Key = binTableData.valueIdx2DataIdx ? binTableData.valueIdx2DataIdx(value2Idx) : undefined;

		return (
			<Fragment>
				<div className="row" style={{marginTop: 15}}>
					<div className="col-md-10">
						<Dropdown
							buttonLbl="Select variable"
							selectedItemKey={selectedItem1Key}
							itemClickAction={selectVarY1}
							selectOptions={selectOptions}
						/>

						<span ref={div => this.labelElement = div} style={{position:'absolute', bottom:10, marginLeft:10}} />
					</div>

					<div className="col-md-2">
						<Dropdown
							buttonLbl="Select variable"
							selectedItemKey={selectedItem2Key}
							itemClickAction={selectVarY2}
							selectOptions={selectOptions}
						/>
					</div>
				</div>

				<div className="row">
					<div className="col-md-12" onMouseOut={graphMouseOut}>
						<div ref={div => this.graphElement = div} style={{width:'100%', height:'calc(55vh - 60px)'}} />
						<div ref={div => this.errorElement = div} style={errorStyle} />
					</div>
				</div>
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
