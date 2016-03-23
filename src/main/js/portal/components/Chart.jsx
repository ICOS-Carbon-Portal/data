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
						width={800}
						strokeWidth={1}
						labels={labels}
						labelsKMB={true}
						legend={'always'}
					/>
					<div id="legendDiv" style={{width:200, fontSize:0.8 + 'em', paddingTop:5}}></div>
				</div>
			);
		} else {
			return <div></div>
		}
	}
}

// Chart.PropTypes = {
// 	binTable: PropTypes.Object.isRequired
// }

export default Chart;
