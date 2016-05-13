import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import {Dygraph} from 'react-dygraphs';

class Chart extends React.Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;
		// console.log({chartRender: props});

		if(props.forChart.data && props.forChart.labels) {
			return (
				<div>
					<Dygraph
						data={props.forChart.data}
						width={props.width ? props.width : 800}
						strokeWidth={1}
						labels={props.forChart.labels}
						ylabel={props.forChart.labels[1]}
						labelsDiv={'legendDiv'}
						series={true}
						axes={{
							x: {
								valueFormatter: function(ms){
									//Firefox hack: add empty bold string
									return '<b></b>' + toISOString(ms);
								}
							},
							y: {
								axisLabelWidth: 65
							}

						}}
						connectSeparatedPoints={true}
						drawXGrid={false} //TODO: This is not implemented in react-dygraphs
						labelsSeparateLines={false}
						labelsKMB={true}
						//sigFigs={7}
						digitsAfterDecimal={4}
						legend={'always'}
					/>
					<div id="legendDiv" style={{width:100 + '%', fontSize:0.9 + 'em', marginTop:5}}></div>
				</div>
			);
		} else {
			return <div></div>
		}
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {};
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

// Chart.PropTypes = {
// 	binTable: PropTypes.Object.isRequired
// }

export default connect(stateToProps, dispatchToProps)(Chart);
