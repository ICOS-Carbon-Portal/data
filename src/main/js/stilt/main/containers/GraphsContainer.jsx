import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Dygraphs from '../components/Dygraphs.jsx';
import {setDateRange} from '../actions.js';
import throttle from '../../../common/main/general/throttle';
import copyprops from '../../../common/main/general/copyprops';
import {formatDate} from '../models/formatting';
import config from '../config';

class GraphsContainer extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const {timeSeriesData} = this.props

		return timeSeriesData ? <Dygraphs data={timeSeriesData} {...this.props}/> : null;
	}
}

function stateToProps(state){

	let annotations = [];
	if(state.timeSeriesData && state.footprint){
		annotations.push({
			series: config.stiltResultColumns[1],
			x: state.footprint.date,
			shortText: '',
			text: state.footprint.filename,
			cssClass: 'glyphicon glyphicon-triangle-bottom',
			attachAtBottom: true
		});
	}

	return Object.assign(
		{
			dateFormatter: formatDate,
			annotations
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

