import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Dygraph from 'dygraphs';

const delay = 10;

class Observations extends React.Component {
	constructor(props) {
		super(props);
		this.state = {working: false};
		this.timeout = false;
	}

	componentDidMount(){
		const dummyObservations = [
			[new Date("2010-01-01"), 10, 20],
			[new Date("2011-01-01"), 30, 30],
			[new Date("2012-01-01"), 50, 40],
			[new Date("2013-01-01"), 70, 50],
		];

		const dummyModel = [
			[new Date("2010-01-01"), 100, 200],
			[new Date("2011-01-01"), 300, 300],
			[new Date("2012-01-01"), 500, 400],
			[new Date("2013-01-01"), 700, 500],
		];

		const observationsGraph = new Dygraph(ReactDOM.findDOMNode(this.refs.observationsGraphDiv),
			dummyObservations,
			{
				width: 700,
				labels: ["Date", "A data", "B data"],
				legend: 'always',
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						valueFormatter: function(ms){
							//Firefox hack: add empty bold string
							return '<b></b>' + toISOString(ms);
						}
					},
					y: {
						axisLabelWidth: 65
					}
				}
			}
		);

		const modelGraph = new Dygraph(ReactDOM.findDOMNode(this.refs.modelGraphDiv),
			dummyModel,
			{
				width: 700,
				labels: ["Date", "AA data", "BB data"],
				legend: 'always',
				connectSeparatedPoints: true,
				labelsKMB: true,
				digitsAfterDecimal: 4,
				axes: {
					x: {
						drawGrid: false,
						valueFormatter: function(ms){
							//Firefox hack: add empty bold string
							return '<b></b>' + toISOString(ms);
						}
					},
					y: {
						axisLabelWidth: 65
					}
				}
			}
		);
		//
		// const graphs = [observationsGraph, modelGraph];
		// const sync = Dygraph.synchronize(graphs);
	}

	componentWillReceiveProps(nextProps){

	}

	componentWillUnmount(){

	}

	shouldComponentUpdate(){
		return false;
	}

	render(){
		const props = this.props;
		const state = this.state;
		// console.log({DygraphsRender: props, state});

		return (
			<div>
				<div ref="observationsGraphDiv" />
				<div ref="modelGraphDiv" />
			</div>
		);
	}
}

function toISOString(ms){
	const date = new Date(ms);

	function pad(number) {
		if (number < 10) {
			return '0' + number;
		}
		return number;
	}

	return date.getUTCFullYear() +
		'-' + pad(date.getUTCMonth() + 1) +
		'-' + pad(date.getUTCDate()) +
		' ' + pad(date.getUTCHours()) +
		':' + pad(date.getUTCMinutes()) +
		':' + pad(date.getUTCSeconds());
}

export default Observations;