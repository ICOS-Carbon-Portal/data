import React from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import {visibilityUpdate, setSelectedYear, setSelectedStation, setStationVisibility, incrementFootprint, pushPlayButton, setDelay} from '../actions';
import ControlPanel from '../components/ControlPanel.jsx';
import config from '../config';


function stateToProps(state){
	return Object.assign(
		copyprops(state, ['stations', 'selectedStation', 'selectedYear', 'footprint', 'options', 'playingMovie']),
		{movieDelay: state.footprintsFetcher ? state.footprintsFetcher.delay : config.defaultDelay}
	);
}

function dispatchToProps(dispatch){
	return {
		updateVisibility: (name, visible) => dispatch(visibilityUpdate(name, visible)),
		selectStation: station => dispatch(setSelectedStation(station)),
		selectYear: year => dispatch(setSelectedYear(year)),
		incrementFootprint: increment => dispatch(incrementFootprint(increment)),
		pushPlay: () => dispatch(pushPlayButton),
		setDelay: delay => dispatch(setDelay(delay))
	};
}

export default connect(stateToProps, dispatchToProps)(props => <ControlPanel {...props} />);

