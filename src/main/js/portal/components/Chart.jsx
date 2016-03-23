import React, { Component, PropTypes } from 'react';
import {Dygraph} from 'react-dygraphs';
import {binTable2Dygraph} from '../models/BinTable2Dygraph';

class Chart extends React.Component {
	constructor(props){
		super(props)
	}

	render() {
		const props = this.props;

		if(props.binTable) {
			console.log("Chart rendering ...");
			const data = binTable2Dygraph(props.binTable)
			console.log("Data converted ...");

			return (
				<div>
					<Dygraph
						data={data}
						strokeWidth={1}
						interactionModel={false}
					/>
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