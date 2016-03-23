import React, { Component } from 'react'
import { connect } from 'react-redux'
import {Line} from 'react-chartjs'
import Select from '../components/Select.jsx'
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
			<Select {...props.selectorPartialProps} {...props.indexChanged} title="Select data object" /> <br />
			{props.chartData
				? <Line
					data={props.chartData.lineData}
					options={{
						animation: false,
						showTooltips: false,
						datasetFill: false,
						bezierCurve: false,
						pointDot: false,
						scaleShowHorizontalLines: true,
						scaleShowVerticalLines: false
					}}
					width="700"
					height="400"
				/>
				: null}
		</div>;
	}
}

function stateToProps(state){

	const fileNames = state.meta
		? state.meta.dataObjects.map(dobj => `${dobj.fileName} (${dobj.nRows})`)
		: [];

	return Object.assign({}, state, {
		selectorPartialProps: {
			selectedIndex: (state.chosenObjectIdx > 0 ? (state.chosenObjectIdx + 1) : 0),
			options: fileNames
		}
	});
}

function dispatchToProps(dispatch){
	return {
		indexChanged: {
			indexChanged: function(dataObjIdxPlus1){
				dispatch(chooseDataObject(dataObjIdxPlus1 - 1));
			}
		}
	};
}

export default connect(stateToProps, dispatchToProps)(App)

