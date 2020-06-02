import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AnimatedToasters } from 'icos-cp-toaster';
import Map from '../components/Map.jsx';
import GraphContainer from '../components/GraphContainer.jsx';
import Table from '../components/Table.jsx';
import Radio from '../components/Radio.jsx';
import {selectVar, selectVarY1, selectVarY2, mapStateChanged} from '../actions';


export class App extends Component {
	constructor(props){
		super(props);

		this.isTouchDevice = 'ontouchstart' in document.documentElement;

		this.afterPointsFiltered = this.onAfterPointsFiltered.bind(this);
		this.graphMouseMove = this.onGraphMouseMove.bind(this);
		this.graphMouseOut = this.onGraphMouseOut.bind(this);
		this.mapPointMouseOver = this.onMapPointMouseOver.bind(this);

		this.state = {
			pointReducer: undefined,
			fromGraph: undefined,
			fromMap: undefined,
			row: 0
		};
	}

	onAfterPointsFiltered(pointReducer, center, zoom){
		this.props.mapStateChanged(center, zoom);
		this.setState({pointReducer});
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
		const {toasterData, binTableData, mapValueIdx, value1Idx, value2Idx, selectOptions, selectVar, selectVarY1, selectVarY2, radios, center, zoom} = this.props;
		const {pointReducer, fromGraph, fromMap, row} = this.state;

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
							<Radio
								horizontal={true}
								containerStyle={{margin:'0 0 10px 0'}}
								radios={radios}
								action={selectVar}
							/>
						</div>

						<Map
							center={center}
							zoom={zoom}
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
							pointReducer={pointReducer}
						/>


					</div>
				</div>

				<GraphContainer
					binTableData={binTableData}
					pointReducer={pointReducer}
					value1Idx={value1Idx}
					value2Idx={value2Idx}
					selectVarY1={selectVarY1}
					selectVarY2={selectVarY2}
					selectOptions={selectOptions}
					fromMap={fromMap}
					graphMouseMove={this.graphMouseMove}
					graphMouseOut={this.graphMouseOut}
				/>
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
		radios: state.radios,
		center: state.center,
		zoom: state.zoom
	};
}

function dispatchToProps(dispatch) {
	return {
		selectVar: value => dispatch(selectVar(value)),
		selectVarY1: value => dispatch(selectVarY1(value)),
		selectVarY2: value => dispatch(selectVarY2(value)),
		mapStateChanged: (center, zoom) => dispatch(mapStateChanged(center, zoom)),
	};
}

export default connect(stateToProps, dispatchToProps)(App);
