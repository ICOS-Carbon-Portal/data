import React, { Component } from 'react';
import Draggable from './Draggable.jsx';
import {drawGraph} from '../models/Dygraphs';
import deepequal from 'deep-equal';
import {Spinner} from './Map.jsx';


const panelBodyHeight = 200;

export default class Timeserie extends Component {
	constructor(props){
		super(props);

		this.draggableStyle = undefined;
	}

	componentWillReceiveProps(nextProps, nextContext) {
		if (nextProps.varName && nextProps.timeserieData.length && !deepequal(this.timeserieData, nextProps.timeserieData)){
			drawGraph(nextProps.timeserieData, nextProps.varName, nextProps.latlng);
		}
	}

	onStopDrag(draggableStyle){
		// save style in case the draggable is closed (for position)
		this.draggableStyle = draggableStyle;
	}

	render(){
		const {isActive, timeserieData, showTSSpinner, closeTimeserie} = this.props;
		const showDivInstruction = !showTSSpinner && timeserieData.length === 0;
		const showDivNoData = !showTSSpinner && !showDivInstruction && timeserieData.every(d => d[1] === 0 || d[1] === null);

		return isActive
			?	<Draggable dragElementId="cp-drag-element" initialPos={initialPos(this.draggableStyle, 'map')} onStopDrag={this.onStopDrag.bind(this)} >
					<Panel
						positionToId="map"
						showDivInstruction={showDivInstruction}
						showDivNoData={showDivNoData}
						showSpinner={showTSSpinner}
						closeTimeserie={closeTimeserie}
					/>
				</Draggable>
			: null;
	}
}

const initialPos = (draggableStyle, masterElId) => {
	return slaveEl => {
		if (draggableStyle) return draggableStyle;

		const masterEl = document.getElementById(masterElId);

		if (masterEl) {
			let {right, bottom} = masterEl.getBoundingClientRect();
			const slaveRootRect = slaveEl.getBoundingClientRect();

			return {
				top: bottom - slaveRootRect.height -2,
				left: right - slaveRootRect.width - 2,
				height: slaveRootRect.height
			};
		}
	}
};

const Panel = ({showDivInstruction, showDivNoData, showSpinner, closeTimeserie}) => {
	const defaultGraphStyle = {border:'none', width:'100%', height:'100%'};
	const graphStyle = showSpinner || showDivInstruction || showDivNoData
		? Object.assign({}, defaultGraphStyle, {visibility:'hidden'})
		: defaultGraphStyle;
	const style = {textAlign:'center', position:'relative', top:'40%'};

	return (
		<div className="panel panel-default" style={{margin:0}}>
			<div id="cp-drag-element" className="panel-heading">
				<span id="graphLegend">&nbsp;</span>
				<CloseBtn closeTimeserie={closeTimeserie} />
			</div>

			<div className="panel-body" style={{padding:'5px 2px', height: panelBodyHeight}}>
				{showDivInstruction && <div style={style}>Click in map to show time serie</div>}
				{showDivNoData && <div style={style}>No data found at that location</div>}
				<div id="graph" style={graphStyle} />
				<Spinner show={showSpinner} />
			</div>
		</div>
	);
};

const CloseBtn = ({closeTimeserie}) => {
	const style = {float:'right', fontSize:22, cursor:'pointer'};
	const className = "glyphicon glyphicon-remove-sign text-danger";
	const onClick = () => {
		closeTimeserie();
	};

	return <span style={style} className={className} onClick={onClick} title="Close" />;
};
