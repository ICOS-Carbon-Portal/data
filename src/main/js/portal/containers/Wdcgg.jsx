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
					<a href="#prototype">To ICOS Data Service prototype</a>
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
					<div ref="metaDiv" id="metaDiv" className="col-md-3"></div>
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

