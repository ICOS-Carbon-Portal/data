import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Dygraphs from '../components/Dygraphs.jsx';
import {setDateRange} from '../actions.js';
import throttle from '../../../common/main/general/throttle';
import copyprops from '../../../common/main/general/copyprops';
import {formatDate} from '../models/formatting';

class GraphsContainer extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const {timeSeriesData} = this.props

		return <div>
			{timeSeriesData ? <Dygraphs data={timeSeriesData} {...this.props}/> : null}
		</div>;
	}
}

function stateToProps(state){
	return Object.assign(
		{
			dateFormatter: formatDate,
			width: 1200
		},
		copyprops(state, ['timeSeriesData', 'dateRange', 'modelComponentsVisibility'])
	);
}

function dispatchToProps(dispatch){
	return {
		updateXRange: throttle(range => {
			dispatch(setDateRange(range));
		}, 200)
	};
}

export default connect(stateToProps, dispatchToProps)(GraphsContainer);

