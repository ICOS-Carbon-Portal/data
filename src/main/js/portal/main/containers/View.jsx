import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import {chooseDataObject, FETCHED_DATA} from '../actions';
import Chart from '../components/Chart.jsx'
import Leaflet from '../components/Leaflet.jsx'

class View extends Component {
	constructor(props){
		super(props);
		this.state = {};
	}

	componentWillReceiveProps(){
		if(this.refs.chartDiv) {
			const chartDiv = ReactDOM.findDOMNode(this.refs.chartDiv);
			const chartDivWidth = chartDiv.getBoundingClientRect().width - 44;
			this.setState({chartDivWidth});
		}

		if(this.refs.mapDiv) {
			const mapDiv = ReactDOM.findDOMNode(this.refs.mapDiv);
			const mapDivWidth = mapDiv.getBoundingClientRect().width;
			this.setState({mapDivWidth});
		}
	}

	getTableRow(rowData, i){
		if (rowData.label == 'LANDING PAGE'){
			return (
				<tr key="lp">
					<th>{rowData.label}</th>
					<td>
						<a href={rowData.value} target="_blank">{rowData.value}</a>
					</td>
				</tr>
			);
		} else {
			return (
				<tr key={"row" + i}>
					<th>{rowData.label}</th>
					<td>{rowData.value}</td>
				</tr>
			);
		}
	}

	onLnkClick(dataObjectInfo){
		this.props.fetchData(dataObjectInfo);
	}

	onChkBxChange(dataObjectInfo, event){
		const isChecked = event.target.checked;

		if (isChecked) {
			this.props.fetchData(dataObjectInfo);
		}

		// const chartComp = this.refs.chartComp;
		// if(chartComp) {
		// 	console.log({chartComp});
		// }
	}

	render() {
		const props = this.props;
		const status = this.props.status;

		return (
			<div id="cp_data_search" className="container-fluid">
				<h1>ICOS Data Service search</h1>

				{props.filteredDataObjects && props.filteredDataObjects.length
					? (
						<div className="row">
							<div className="col-md-3">
								<label>Number of returned data objects:</label> <span>{props.filteredDataObjects.length}</span>
							</div>
						</div>
					)
					: null
					}

				<div className="row">
					<div className="col-md-3" style={{maxHeight: 430, overflow: 'auto'}}>
						{props.filteredDataObjects
							? (
								<table className="table table-striped table-condensed table-bordered">
									<tbody>
									<tr>
										<th>Data object (sampling points)</th>
									</tr>
									{props.filteredDataObjects.map((rowData, i) => {
										return (
											<tr key={"row" + i}>
												<td>
													<span className="lnk" onClick={() => this.onLnkClick(rowData)}>{rowData.fileName} ({rowData.nRows})</span>
													{/*<input type="checkbox" onChange={(event) => this.onChkBxChange(rowData, event)} value={rowData} />
													<span>{rowData.fileName} ({rowData.nRows})</span>*/}
												</td>
											</tr>
										);
									})}
									</tbody>
								</table>
							)
							: null
						}
					</div>
					<div ref="metaDiv" id="metaDiv" className="col-md-9" style={{maxHeight: 430, overflow: 'auto'}}>
						<table className="table table-striped table-condensed table-bordered">
							<tbody>
							{status === FETCHED_DATA
								? props.metaTable.map((rowData, i) =>{
									return this.getTableRow(rowData, i);
								})
								: null
							}
							</tbody>
						</table>
					</div>
				</div>
				<div className="row">
					<div ref="chartDiv" id="chartDiv" className="col-md-9">
						{status === FETCHED_DATA
							? <Chart ref="chartComp" {...props.forChart} width={this.state.chartDivWidth} />
							: null
						}
					</div>
					<div ref="mapDiv" id="mapDiv" className="col-md-3">
						{status === FETCHED_DATA
							? <Leaflet lat={props.forMap.geom.lat} lon={props.forMap.geom.lon} width={this.state.mapDivWidth} />
							: null
						}
					</div>
				</div>
				<div className="row">

				</div>
			</div>
		);
	}
}

function stateToProps(state){
	const dataObjSelected = (state.metaData != null);

	return Object.assign({},
		state,
		{
			metaTable: dataObjSelected
				? state.metaData.format
				: null
		},
		{
			forMap: dataObjSelected
				? {	geom: state.metaData.geom }
				: null
		}
	);
}

function dispatchToProps(dispatch){
	return {
		fetchData(dataObjectInfo){
			dispatch(chooseDataObject(dataObjectInfo));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(View);

