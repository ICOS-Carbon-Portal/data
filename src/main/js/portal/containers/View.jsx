import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import {chooseDataObject, fetchTableFormat, FETCHED_DATA} from '../actionsForWdcgg';
import config from '../config';
import Chart from '../components/Chart.jsx'
import Leaflet from '../components/Leaflet.jsx'
import {routeUpdated} from '../actions'

class View extends Component {
	constructor(props){
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.props.fetchTableFormat(config.wdcggSpec);
	}

	componentWillReceiveProps(nextProps){
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

	filteredDO2Arr(filteredDataObjects){
		if (filteredDataObjects){
			function* obj2Arr(obj) {
				for (let prop of Object.keys(obj))
					yield {
						id: prop,
						fileName: obj[prop][0].value,
						nRows: obj[prop][0].count
					};
			}

			return Array.from(obj2Arr(filteredDataObjects));
		} else {
			return null;
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

	render() {
		const props = this.props;
		const DOArr = this.filteredDO2Arr(props.filteredDataObjects);
		const status = this.props.status;

		if (!props.filteredDataObjects){
			this.props.showSearch();
		}

		return (
			<div id="cp_data_search" className="container-fluid">
				<h1>ICOS Data Service search</h1>

				{DOArr && DOArr.length
					? (
						<div className="row">
							<div className="col-md-3">
								<label>Number of returned data objects:</label> <span>{DOArr.length}</span>
							</div>
						</div>
					)
					: null
					}

				<div className="row">
					<div className="col-md-3" style={{maxHeight: 430, overflow: 'auto'}}>
						{DOArr
							? (
								<table className="table table-striped table-condensed table-bordered">
									<tbody>
									<tr>
										<th>Data object (sampling points)</th>
									</tr>
									{DOArr.map((rowData, i) => {
										return (
											<tr key={"row" + i}>
												<td>
													<span className="lnk" onClick={() => this.onLnkClick(rowData)}>{rowData.fileName} ({rowData.nRows})</span>
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
								? props.forChart.format.map((rowData, i) =>{
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
							? <Chart {...props.forChart} width={this.state.chartDivWidth} />
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
	const dataObjSelected = (state.wdcgg.dataObjectId != null);

	return Object.assign({route: state.route},
		state.icos,
		state.wdcgg,
		{
			forChart: dataObjSelected
				? {
				tableFormat: state.wdcgg.tableFormat,
				binTable: state.wdcgg.binTable,
				dataObjectId: state.wdcgg.dataObjectId,
				format: [{label: "LANDING PAGE", value: state.wdcgg.dataObjectId}].concat(state.wdcgg.format)
			}
				: null
		},
		{
			forMap: dataObjSelected
				? {
				geom: {
					lat: Math.floor(Math.random() * 60),
					lon: Math.floor(Math.random() * 60)
				}
			}
				: null
		}
	);
}

function dispatchToProps(dispatch){
	return {
		fetchTableFormat(wdcggSpec){
			dispatch(fetchTableFormat(wdcggSpec));
		},

		fetchData(dataObjectInfo){
			dispatch(chooseDataObject(dataObjectInfo));
		},

		showSearch(){
			dispatch(routeUpdated('search'));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(View);

