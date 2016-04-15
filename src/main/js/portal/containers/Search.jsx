import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import { fromDateSet, toDateSet, updateFilter, fetchGlobalTimeInterval } from '../actionsForIcos';
import {chooseDataObject, fetchTableFormat, FETCHED_DATA} from '../actionsForWdcgg';
import config from '../config';
import PropertyValueSelect from '../components/PropertyValueSelect.jsx';
import Chart from '../components/Chart.jsx'
import Leaflet from '../components/Leaflet.jsx'
import DatePicker from '../components/DatePickerEncloser.jsx';


class Search extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		this.props.fetchTableFormat(config.wdcggSpec);

		if(!this.props.fromDate) {
			this.props.globalIntervalFetch();
		}
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

		const fromDate = props.fromDate || this.props.fromDateMin;
		const toDate = props.toDate || this.props.toDateMax;
		const DOArr = this.filteredDO2Arr(props.filteredDataObjects);
		const status = this.props.status;

		return <div id="cp_data_search" className="container-fluid">
			<h1>ICOS Data Service search</h1>
			
			<DatePicker 
				date1={ fromDate } 
				date2={ toDate } 
				onChange1={ this.props.fromDateChange } 
				onChange2={ this.props.toDateChange } 
				minDate={ this.props.fromDateMin } 
				maxDate={ this.props.toDateMax } />
				{
					config.wdcggProps.map(
						({label, uri}, i) =>
							<PropertyValueSelect
								label={label}
								prop={uri}
								filter={props.filters[uri]}
								valueCounts={props.propValueCounts[uri]}
								filterUpdate={props.filterUpdate}
								key={i}
							/>
					)
				}

				<div className="row">
					<div className="col-md-3" style={{maxHeight: 420, overflow: 'auto'}}>
						{DOArr && DOArr.length < 500
							?	<table className="table table-striped table-condensed table-bordered">
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
							: null
						}
					</div>
					<div ref="metaDiv" id="metaDiv" className="col-md-8" style={{maxHeight: 420, overflow: 'auto'}}>
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
					<div ref="chartDiv" id="chartDiv" className="col-md-8">
						{status === FETCHED_DATA
							? <Chart {...props.forChart} width={this.state.chartDivWidth} />
							: null
						}
					</div>
					<div ref="mapDiv" id="mapDiv" className="col-md-4">
						{status === FETCHED_DATA
							? <Leaflet lat={props.forMap.geom.lat} lon={props.forMap.geom.lon} width={this.state.mapDivWidth} />
							: null
						}
					</div>
				</div>
				<div className="row">

				</div>
		</div>;
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
		fromDateChange: function(date){console.log(date);
			dispatch(fromDateSet(date));
		},
		
		toDateChange: function(date){
			dispatch(toDateSet(date));
		},

		filterUpdate: function(propUri, filter){
			dispatch(updateFilter(propUri, filter));
		},

		globalIntervalFetch(){
			dispatch(fetchGlobalTimeInterval);
		},

		fetchTableFormat(wdcggSpec){
			dispatch(fetchTableFormat(wdcggSpec));
		},

		fetchData(dataObjectInfo){
			dispatch(chooseDataObject(dataObjectInfo));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Search);

