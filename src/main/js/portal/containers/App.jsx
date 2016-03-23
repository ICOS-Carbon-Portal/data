import React, { Component } from 'react'
import { connect } from 'react-redux'
import Select from '../components/Select.jsx'
import Chart from '../components/Chart.jsx'
import {chooseDataObject} from '../actions.js'
import { FETCHED_META, FETCHED_DATA } from '../actions'

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const status = this.props.status;
		const props = this.props;

		if(status !== FETCHED_META && status !== FETCHED_DATA) {
			const error = (status === 'ERROR') ? (': ' + props.error.message + '\n' + props.error.stack): '';
			return <div>{status + error}</div>;
		}

		return <div>
			<Select {...props.selectorPartialProps} {...props.selectorProps} title="Select data object" /> <br /><br />
			<Chart {...props.forChart} />
		</div>;
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
		}
	};
}

export default connect(stateToProps, dispatchToProps)(App)

