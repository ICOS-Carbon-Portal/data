import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import Map from '../components/Map.jsx';
import Graph from '../components/Graph.jsx';
import Table from '../components/Table.jsx';
import Dropdown from '../components/Dropdown.jsx';
import {selectVar} from '../actions';


export class App extends Component {
	constructor(props){
		super(props);

		this.isTouchDevice = 'ontouchstart' in document.documentElement;

		this.afterPointsFiltered = this.onAfterPointsFiltered.bind(this);
		this.graphMouseMove = this.onGraphMouseMove.bind(this);
		this.graphMouseOut = this.onGraphMouseOut.bind(this);
		this.mapPointMouseOver = this.onMapPointMouseOver.bind(this);
		this.mapPointMouseOver = this.onMapPointMouseOver.bind(this);

		this.state = {
			reducedPoints: undefined,
			fromGraph: undefined,
			fromMap: undefined,
			row: 0
		};
	}

	onAfterPointsFiltered(reducedPoints){
		this.setState({reducedPoints});
	}

	onGraphMouseMove(latitude, longitude, row){
		this.setState({fromGraph: {latitude, longitude}, row});
	}

	onGraphMouseOut(){
		this.setState({fromGraph: undefined});
	}

	onMapPointMouseOver(mapData){
		const fromMap = {dataX: mapData.dataX, dataY: mapData.dataY};
		const row = mapData.row || this.state.row;
		this.setState({fromMap, row});
	}

	onBtnClick(axel, valueIdx){
		this.props.selectVar(axel, this.props.binTableData.valueIdx2DataIdx(valueIdx));
	}

	render(){
		const {toasterData, binTableData, mapValueIdx, axel, value1Idx, value2Idx, selectOptions, selectVar} = this.props;
		const {reducedPoints, fromGraph, fromMap, row} = this.state;
		const selectedItem1Key = binTableData.valueIdx2DataIdx ? binTableData.valueIdx2DataIdx(value1Idx) : undefined;
		const selectedItem2Key = binTableData.valueIdx2DataIdx ? binTableData.valueIdx2DataIdx(value2Idx) : undefined;
		const labelStyle = {
			backgroundColor: 'white',
			padding: '3px 5px',
			fontSize: 14,
			borderRadius: 5,
			boxShadow: '0 1px 5px rgba(0,0,0,0.4)'
		};
		const variable = binTableData.isValidData ? binTableData.column(mapValueIdx) : undefined;
		const label = variable && mapValueIdx !== undefined
			? `${variable.label} [${variable.unit}]`
			: 'Waiting for data...';

		const mapBtnY1Class = axel === 'y1' ? "btn btn-primary active" : "btn btn-primary";
		const mapBtnY2Class = axel === 'y2' ? "btn btn-primary active" : "btn btn-primary";
		const mapBtnY1Style = axel === 'y1'
			? {marginLeft:10}
			: {boxShadow: '0 3px 5px rgba(0,0,0,0.7)', marginLeft:10};
		const mapBtnY2Style = axel === 'y2'
			? {float:'right', marginLeft:10}
			: {boxShadow: '0 3px 5px rgba(0,0,0,0.7)', float:'right', marginLeft:10};

		return (
			<div className="container-fluid" style={{margin: 10}}>
				<AnimatedToasters
					autoCloseDelay={5000}
					toasterData={toasterData}
					maxWidth={400}
				/>

				<div className="row">
					<div className="col-md-9">
						<div style={{position:'absolute', top:5, left:70, zIndex:999}}>
							<span style={labelStyle}>{label}</span>
						</div>

						<Map
							binTableData={binTableData}
							valueIdx={mapValueIdx}
							afterPointsFiltered={this.afterPointsFiltered}
							fromGraph={fromGraph}
							mapPointMouseOver={this.mapPointMouseOver}
						/>
					</div>

					<div className="col-md-3">
						<Table
							isTouchDevice={this.isTouchDevice}
							binTableData={binTableData}
							row={row}
							reducedPoints={reducedPoints}
						/>


					</div>
				</div>

				<div className="row" style={{marginTop: 15}}>
					<div className="col-md-6">
						<Dropdown
							buttonLbl="Select variable"
							selectedItemKey={selectedItem1Key}
							itemClickAction={value => selectVar('y1', value)}
							selectOptions={selectOptions}
						/>

						<button
							className={mapBtnY1Class}
							style={mapBtnY1Style}
							onClick={this.onBtnClick.bind(this, 'y1', value1Idx)}
						>Show in map
						</button>
					</div>

					<div className="col-md-6">
						<button
							className={mapBtnY2Class}
							style={mapBtnY2Style}
							onClick={this.onBtnClick.bind(this, 'y2', value2Idx)}
							>Show in map
						</button>

						<Dropdown
							style={{float:'right'}}
							buttonLbl="Select variable"
							selectedItemKey={selectedItem2Key}
							itemClickAction={value => selectVar('y2', value)}
							selectOptions={selectOptions}
						/>
					</div>
				</div>

				<div className="row">
					<div className="col-md-12" onMouseOut={this.graphMouseOut}>
						<Graph
							binTableData={binTableData}
							value1Idx={value1Idx}
							value2Idx={value2Idx}
							graphMouseMove={this.graphMouseMove}
							fromMap={fromMap}
						/>
					</div>
				</div>
			</div>
		);
	}
}

function stateToProps(state) {
	return {
		toasterData: state.toasterData,
		binTableData: state.binTableData,
		selectOptions: state.selectOptions,
		mapValueIdx: state.mapValueIdx,
		axel: state.axel,
		value1Idx: state.value1Idx,
		value2Idx: state.value2Idx,
	};
}

function dispatchToProps(dispatch) {
	return {
		selectVar: (axis, value) => dispatch(selectVar(axis, value))
	};
}

export default connect(stateToProps, dispatchToProps)(App);
