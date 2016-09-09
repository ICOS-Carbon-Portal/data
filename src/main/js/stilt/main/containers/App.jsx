import React, { Component } from 'react';
import { connect } from 'react-redux';
import StationsMapContainer from './StationsMapContainer.jsx';
import FootprintContainer from './FootprintContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';
import ControlPanel from '../components/ControlPanel.jsx';
import copyprops from '../../../common/main/general/copyprops';
import {visibilityUpdate} from '../actions';
import {setSelectedYear} from '../actions.js';
import {setSelectedStation} from '../actions.js';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;
		// console.log({props});

		return <div className="container-fluid">
			<div className="row">

				<div className="col-md-3">
					<FootprintContainer />
				</div>

				<div className="col-md-9">
					<ControlPanel {...props} />
				</div>

			</div>

			<div className="row">
				<div className="col-md-12">
					<GraphsContainer />
				</div>
			</div>

		</div>;
	}
}

function stateToProps(state){
	return copyprops(state, ['stations', 'selectedStation', 'selectedYear', 'footprint', 'modelComponentsVisibility']);
}

function dispatchToProps(dispatch){
	return {
		updateVisibility: (name, visible) => dispatch(visibilityUpdate(name, visible)),
		selectStation: station => dispatch(setSelectedStation(station)),
		selectYear: year => dispatch(setSelectedYear(year))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

