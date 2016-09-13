import React from 'react';
import { connect } from 'react-redux';
import copyprops from '../../../common/main/general/copyprops';
import {visibilityUpdate, setSelectedYear, setSelectedStation, setStationVisibility, incrementFootprint, pushPlayButton} from '../actions';
import ControlPanel from '../components/ControlPanel.jsx';


function stateToProps(state){
	return copyprops(state, ['stations', 'selectedStation', 'selectedYear', 'footprint', 'options', 'playingMovie']);
}

function dispatchToProps(dispatch){
	return {
		updateVisibility: (name, visible) => dispatch(visibilityUpdate(name, visible)),
		selectStation: station => dispatch(setSelectedStation(station)),
		selectYear: year => dispatch(setSelectedYear(year)),
		updateStationVisibility: visibility => dispatch(setStationVisibility(visibility)),
		incrementFootprint: increment => dispatch(incrementFootprint(increment)),
		pushPlay: () => dispatch(pushPlayButton)
	};
}

export default connect(stateToProps, dispatchToProps)(props => <ControlPanel {...props} />);

