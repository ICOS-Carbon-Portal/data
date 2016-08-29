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
		// const props = this.props;
		// const dataBndry = getDataBndry(props);
		//
		// const graph = new Dygraph(ReactDOM.findDOMNode(this.refs.graphDiv),
		// 	dataBndry,
		// 	{
		// 		strokeWidth: 0,
		// 		width: props.width,
		// 		labels: props.forChart.labels,
		// 		legend: 'always',
		// 		labelsDiv: 'legendDiv',
		// 		labelsSeparateLines: false,
		// 		connectSeparatedPoints: true,
		// 		labelsKMB: true,
		// 		digitsAfterDecimal: 4,
		// 		axes: {
		// 			x: {
		// 				drawGrid: false,
		// 				valueFormatter: function(ms){
		// 					//Firefox hack: add empty bold string
		// 					return '<b></b>' + toISOString(ms);
		// 				}
		// 			},
		// 			y: {
		// 				axisLabelWidth: 65
		// 			}
		// 		}
		// 	}
		// );
		//
		// const graphDiv = ReactDOM.findDOMNode(this.refs.graphDiv).getBoundingClientRect();
		//
		// this.setState({
		// 	graph,
		// 	top: graphDiv.top + 50,
		// 	left: graphDiv.left,
		// 	working: true
		// });
		//
		// this.delayedRender(graph, props.forChart.data, props.forChart.labels);
	}

	delayedRender(graph, data, labels){
		const self = this;
		this.clearTimeout();

		this.timeout = setTimeout(function(){
			graph.updateOptions( { file: data, labels, strokeWidth: 1 } );
			self.setState({working: false});
		}, delay);
	}

	componentWillReceiveProps(nextProps){
		// console.log({componentWillReceiveProps: this.props, nextProps, state: this.state});

		// if(nextProps.status != PIN_DATA) {
		// 	this.setState({working: true});
		// }
		//
		// if(nextProps.status == FETCHED_DATA || nextProps.status == REMOVED_DATA){
		// 	this.delayedRender(this.state.graph, nextProps.forChart.data, nextProps.forChart.labels);
		// }
	}

	componentWillUnmount(){
		this.clearTimeout();
	}

	clearTimeout(){
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
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
				<div ref="graphDiv" />
				<div id="legendDiv" style={{width:100 + '%', fontSize:0.9 + 'em', marginTop:5}}></div>
				{state.working
					?	<span style={{position: 'absolute', top: state.top, left: state.left, zIndex: 1000}} className={"glyphicon glyphicon-refresh spinning"}></span>
					: null
				}
			</div>
		);
	}
}

function getDataBndry(props){
	const dataLength = props.forChart.data.length;
	return props.forChart.data.slice(0, 1).concat(props.forChart.data.slice(dataLength - 1, dataLength));
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