import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import Select from '../components/Select.jsx'
import Chart from '../components/Chart.jsx'
import {chooseDataObject, fetchMetaData} from '../actionsForWdcgg'
import { FETCHING_META, ERROR, INIT, FETCHED_DATA } from '../actionsForWdcgg'
import config from '../config';

class Wdcgg extends Component {
	constructor(props){
		super(props);
		this.state = {};
	}

	componentDidMount() {
		if(this.props.selectorPartialProps.options.length === 0) {
			this.props.fetchMeta(config.wdcggSpec);
		}
	}

	componentWillReceiveProps(nextProps){
		if(this.refs.chartDiv) {
			const chartDiv = ReactDOM.findDOMNode(this.refs.chartDiv);
			const chartDivWidth = chartDiv.getBoundingClientRect().width - 44;
			this.setState({chartDivWidth});
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
					<div className="col-md-5">
						<Select {...props.selectorPartialProps} {...props.selectorProps} size="10" title="Select data object" />
					</div>
				</div>

				<div className="row">
					<div ref="chartDiv" id="chartDiv" className="col-md-7">
						{status === FETCHED_DATA
							? <Chart {...props.forChart} width={this.state.chartDivWidth} />
							: null
						}
					</div>
				</div>
				<div className="row">
					<div ref="metaDiv" id="metaDiv" className="col-md-12">
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
				format: [{label: "LANDING PAGE", value: state.meta.dataObjects[state.chosenObjectIdx].id}].concat(state.format)
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

