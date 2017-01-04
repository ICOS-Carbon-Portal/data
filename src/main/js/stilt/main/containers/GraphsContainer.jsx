import React from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';

import config from '../config';
import {setDateRange} from '../actions.js';
import {formatDate} from '../models/formatting';
import Dygraphs from '../components/Dygraphs.jsx';

const GraphsContainer = props => props.timeSeriesData
	? <Dygraphs data={props.timeSeriesData} {...props}/>
	: <div></div>;

function stateToProps(state){

	const firstVisibleStilt = config.stiltResultColumns.concat(config.wdcggColumns).find(
		series => state.options.modelComponentsVisibility[series.label]
	);

	const annotations = state.footprint && firstVisibleStilt
		? [{
			series: firstVisibleStilt.label,
			x: state.footprint.date,
			shortText: '',
			text: state.footprint.filename,
			cssClass: 'glyphicon glyphicon-triangle-bottom',
			//attachAtBottom: true,
			tickHeight: 10
		}]
		: [];

	return Object.assign(
		{
			dateFormatter: formatDate,
			annotations,
			visibility: state.options.modelComponentsVisibility,
			graphOptions: {
				ylabel: 'total CO2 [ppm]',
				y2label: 'CO2 components [ppm]',
				xlabel: 'timestamp (UTC)',
				axes: {
					y2: {
						axisLabelFormatter: number => Number(number).toFixed(2)
					}
				}
			}
		},
		copyprops(state, ['timeSeriesData', 'dateRange'])
	);
}

function dispatchToProps(dispatch){
	return {
		updateXRange: range => dispatch(setDateRange(range))
	};
}

export default connect(stateToProps, dispatchToProps)(GraphsContainer);

