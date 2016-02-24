import React, { Component } from 'react'
import { connect } from 'react-redux'
import {LineChart} from 'react-d3'

class App extends Component {
	constructor(props){
		super(props)
	}

	render() {
		const status = this.props.status;

		if(status !== 'FETCHED') return <div>{status}</div>;

		const tbl = this.props.binTable;

		const chartValues = Array.from({length: tbl.length}, (_, i) => {
			const row = tbl.row(i);
			return {x: row[0], y: row[2]};
		});

		const lineData = [{
			name: 'col2',
			values: chartValues
		}];

		return <LineChart
			legend={true}
			data={lineData}
			width={600}
			height={400}
			viewBoxObject={{
				x: 0,
				y: 0,
				width: 500,
				height: 400
			}}
			title={this.props.status}
			yAxisLabel={"Random value"}
			xAxisLabel={"Number"}
			gridHorizontal={true}
		/>;
	}
}

export default connect(state => state)(App)

