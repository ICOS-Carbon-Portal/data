import React, { Component } from 'react';
import Draggable from 'icos-cp-draggable';
import {drawGraph} from '../models/Dygraphs';
import deepequal from 'deep-equal';
import {ReactSpinner} from 'icos-cp-spinner';


const panelBodyHeight = 200;

export default class Timeserie extends Component {
	constructor(props){
		super(props);

		this.draggableStyle = undefined;
	}

	componentWillReceiveProps(nextProps, nextContext) {
		const hasData = nextProps.varName && nextProps.timeserieData.length;
		const isDifferent = !deepequal(this.timeserieData, nextProps.timeserieData);

		if (hasData && isDifferent){
			drawGraph(nextProps.timeserieData, nextProps.varName, nextProps.latlng);
		}
	}

	onStopDrag(draggableStyle){
		// save style in case the draggable is closed (for position)
		this.draggableStyle = draggableStyle;
	}

	render(){
		const {isSites, isActive, isFetchingTimeserieData, timeserieData, showTSSpinner, closeTimeserie} = this.props;
		const showDivNoData = !showTSSpinner && !isFetchingTimeserieData && isEmpty(timeserieData);

		return isActive
			?	<Draggable dragElementId="cp-drag-element" initialPos={initialPos(this.draggableStyle, 'map')} onStopDrag={this.onStopDrag.bind(this)} >
					<Panel
						positionToId="map"
						isFetchingTimeserieData={isFetchingTimeserieData}
						showDivNoData={showDivNoData}
						isSites={isSites}
						showSpinner={showTSSpinner}
						closeTimeserie={closeTimeserie}
					/>
				</Draggable>
			: null;
	}
}

const isEmpty = timeserieData => {
	return timeserieData.length === 0 || timeserieData.every(d => d[1] === 0 || d[1] === null);
};

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

const Panel = ({isSites, isFetchingTimeserieData, showDivNoData, showSpinner, closeTimeserie}) => {
	const defaultGraphStyle = {border:'none', width:'100%', height:'100%'};
	const graphStyle = isFetchingTimeserieData || showDivNoData || showSpinner
		? Object.assign({}, defaultGraphStyle, {visibility:'hidden'})
		: defaultGraphStyle;
	const style = {textAlign:'center', position:'relative', top:'40%'};

	return (
		<div className="card" style={{margin:0}}>
			<div id="cp-drag-element" className="card-header">
				<span id="graphLegend">&nbsp;</span>
				<CloseBtn closeTimeserie={closeTimeserie} />
			</div>

			<div className="card-body" style={{padding:'5px 2px', height: panelBodyHeight}}>
				{showDivNoData && <div style={style}>No data found at that location</div>}
				<div id="graph" style={graphStyle} />
				<ReactSpinner isSites={isSites} show={showSpinner} />
			</div>
		</div>
	);
};

const CloseBtn = ({closeTimeserie}) => {
	const style = {float:'right', fontSize:22, cursor:'pointer'};
	const className = "fas fa-times-circle text-danger";
	const onClick = () => {
		closeTimeserie();
	};

	return <span style={style} className={className} onClick={onClick} title="Close" />;
};
