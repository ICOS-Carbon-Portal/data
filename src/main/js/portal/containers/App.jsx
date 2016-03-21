import React, { Component } from 'react'
import { connect } from 'react-redux'
// import {LineChart} from 'react-d3'
import {Line} from 'react-chartjs'
import Select from '../components/Select.jsx'
import {yAxisChosen} from '../actions.js'

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const status = this.props.status;
		const props = this.props;

		if(status !== 'FETCHED') {
			const error = (status === 'ERROR') ? ': ' + props.error.message : '';
			return <div>{status + error}</div>;
		}

		if(props.chartData) {
			console.log({lineData: props.chartData.lineData});
		}

		return <div>
			<Select {...props.selectorPartialProps} {...props.indexChanged} title="Select Y-axis column" />
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

	const columnNames = state.chosenTable >= 0
		? state.tables[state.chosenTable].columnNames.slice(1)
		: [];

	return {
		status: state.status,
		yAxisColumn: state.yAxisColumn,
		chartData: state.chartData,
		selectorPartialProps: {
			selectedIndex: (state.yAxisColumn > 0 ? state.yAxisColumn : 0),
			options: columnNames
		}
	};
}

function dispatchToProps(dispatch){
	return {
		indexChanged: {
			indexChanged: function(columnIndex){
				dispatch(yAxisChosen(columnIndex));
			}
		}
	};
}

export default connect(stateToProps, dispatchToProps)(App)

