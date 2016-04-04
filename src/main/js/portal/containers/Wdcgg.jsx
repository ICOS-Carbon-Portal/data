import React, { Component } from 'react'
import { connect } from 'react-redux'
import Select from '../components/Select.jsx'
import Chart from '../components/Chart.jsx'
import {chooseDataObject, fetchMetaData} from '../actionsForWdcgg'
import { FETCHING_META, ERROR, INIT, FETCHED_DATA } from '../actionsForWdcgg'

class Wdcgg extends Component {
	constructor(props){
		super(props);
	}

	componentDidMount() {
		if(this.props.selectorPartialProps.options.length === 0) {
			this.props.fetchMeta('http://meta.icos-cp.eu/ontologies/cpmeta/instances/wdcggDataObject');
		}
	}

	getWidth() {
		if(this.refs.chartDiv) {
			const chartDiv = this.refs.chartDiv;
			return chartDiv.getBoundingClientRect().width;
		}
	}

	render() {
		const status = this.props.status;
		const props = this.props;

		if(status === ERROR) {
			return <div>
				<div>{ERROR + ': ' + props.error.message}</div>
				<div>{props.error.stack}</div>
			</div>;
		}

		if(status === FETCHING_META || status === INIT) {
			return <div>{status}</div>;
		}

		return (
			<div className="container-fluid">
				<div className="row">
					<a href="#icos">To ICOS Data Service prototype</a>
				</div>
				<div className="row">
					<div className="col-md-3">
						<Select {...props.selectorPartialProps} {...props.selectorProps} size="10" className={"form-control"} title="Select data object" />
					</div>
				</div>

				<div className="row">
					<div ref="chartDiv" id="chartDiv" className="col-md-5">
						{status === FETCHED_DATA
							? <Chart {...props.forChart} width={this.getWidth()} />
							: null
						}
					</div>
					<div ref="metaDiv" id="metaDiv" className="col-md-4" style={{marginLeft: 20}}>
						<table className="table table-striped table-condensed table-bordered">
							<tbody>
						{status === FETCHED_DATA
							? props.forChart.format.map((rowData, i) =>{
								return (
									<tr key={"row" + i}>
										<th>{rowData.label}</th>
										<td>{rowData.value}</td>
									</tr>
								);
							})
							: null
						}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}
}

function stateToProps(state){

	const fileNames = state.meta
		? state.meta.dataObjects.map(dobj => `${dobj.fileName} (${dobj.nRows})`)
		: [];

	const dataObjSelected = (state.chosenObjectIdx >= 0);

	return {
		status: state.status,
		error: state.error,
		forChart: dataObjSelected
			? {
				tableFormat: state.meta.tableFormat,
				binTable: state.binTable,
				dataObjInfo: state.meta.dataObjects[state.chosenObjectIdx],
				format: state.format
			}
			: null,
		selectorPartialProps: {
			selectedIndex: dataObjSelected ? (state.chosenObjectIdx + 1) : 0,
			options: fileNames
		}
	};
}

function dispatchToProps(dispatch){
	return {
		selectorProps: {
			indexChanged: function(dataObjIdxPlus1){
				dispatch(chooseDataObject(dataObjIdxPlus1 - 1));
			}
		},

		fetchMeta(objSpec){
			dispatch(fetchMetaData(objSpec));
		}
	};
}

export default connect(state => stateToProps(state.wdcgg), dispatchToProps)(Wdcgg);

