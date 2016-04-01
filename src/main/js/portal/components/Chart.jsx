import React, { Component, PropTypes } from 'react';
import {Dygraph} from 'react-dygraphs';
import {binTable2Dygraph, getLabels} from '../models/chartDataMaker';

class Chart extends React.Component {
	constructor(props){
		super(props)
	}

	render() {
		const props = this.props;

		if(props.binTable) {
			const data = binTable2Dygraph(props.binTable)
			const labels = getLabels(props.tableFormat, props.dataObjInfo);

			return (
				<div>
					<Dygraph
						data={data}
						width={props.width ? props.width : 800}
						strokeWidth={1}
						labels={labels}
						ylabel={labels[1]}
						labelsDiv={'legendDiv'}
						axes={{
							x: {
								valueFormatter: function(ms){
									return new Date(ms).toISOString()
								}
							}

						}}
						drawXGrid={false} //TODO: This is not implemented in react-dygraphs
						labelsSeparateLines={false}
						labelsKMB={true}
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

(function () {
	function pad(number) {
		if (number < 10) {
			return '0' + number;
		}
		return number;
	}

	Date.prototype.toISOString = function () {
		return '<b></b>' + this.getUTCFullYear() +
			'-' + pad(this.getUTCMonth() + 1) +
			'-' + pad(this.getUTCDate()) +
			' ' + pad(this.getUTCHours()) +
			':' + pad(this.getUTCMinutes()) +
			':' + pad(this.getUTCSeconds());
	};

}());

// Chart.PropTypes = {
// 	binTable: PropTypes.Object.isRequired
// }

export default Chart;
