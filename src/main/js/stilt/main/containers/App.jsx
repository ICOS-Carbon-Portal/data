import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import FootprintContainer from './FootprintContainer.jsx';
import ControlPanelContainer from './ControlPanelContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';

const marginTop = 10;

class App extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div>
				<AnimatedToasters toasterData={this.props.toasterData} autoCloseDelay={5000} />

				<div className="page-header">
					<h1>STILT footprint visualization</h1>
				</div>
				<div className="row" style={{marginTop}}>

					<div className="col-md-4">
						<FootprintContainer />
					</div>

					<div className="col-md-8">
						<ControlPanelContainer />
					</div>

				</div>

				<div className="row" style={{marginTop}}>
					<div className="col-md-12">
						<GraphsContainer />
					</div>
				</div>

			</div>
		);
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

export default connect(stateToProps)(App)