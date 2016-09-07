import React, { Component } from 'react';
import { connect } from 'react-redux';
import StationsMapContainer from './StationsMapContainer.jsx';
import FootprintContainer from './FootprintContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';
import ControlPanel from '../components/ControlPanel.jsx';
import copyprops from '../../../common/main/general/copyprops';
import {visibilityUpdate} from '../actions';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;
		// console.log({props});

		return (
			<div className="container-fluid">
				<div className="row">

					<div className="col-md-3">
						<div className="row">
							<div className="col-md-12">
								<StationsMapContainer />
							</div>
						</div>

						<div className="row">
							<div className="col-md-12">
								<FootprintContainer />
							</div>
						</div>
					</div>

					<div className="col-md-8">
						<div className="row">
							<div className="col-md-12">
								<ControlPanel {...props} />
							</div>
						</div>
						<div className="row">
							<div className="col-md-12">
								<GraphsContainer />
							</div>
						</div>
					</div>

				</div>
			</div>
		);
	}
}

function stateToProps(state){
	return copyprops(state, ['footprint', 'modelComponentsVisibility']);;
}

function dispatchToProps(dispatch){
	return {
		updateVisibility: (name, visible) => dispatch(visibilityUpdate(name, visible))
	};
}

export default connect(stateToProps, dispatchToProps)(App);

