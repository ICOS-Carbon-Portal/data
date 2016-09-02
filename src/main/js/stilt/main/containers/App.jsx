import React, { Component } from 'react';
import { connect } from 'react-redux';
import StationsMapContainer from './StationsMapContainer.jsx';
import FootprintContainer from './FootprintContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';
import {datetimeFromFile} from '../models/FootprintsRegistry';


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

					<div className="col-md-4">
						<div className="row">
							<div className="col-md-12">
								<GraphsContainer />
							</div>
						</div>
					</div>

					<div className="col-md-5">
						<div className="row">
							<h2><span><b>Selected date:</b> </span><span>{props.midDate}</span></h2>
						</div>
						<div className="row">
							<h2><span><b>Showing footprint:</b> </span><span>{props.footprintDate}</span></h2>
						</div>
					</div>

				</div>
			</div>
		);
	}
}

function stateToProps(state){
	const footprintDate = state.footprint ? new Date(datetimeFromFile(state.footprint)).toUTCString() : '?';
	const midDate = state.midDate ? state.midDate.toUTCString() : '?';
	return {footprintDate, midDate};
}

function dispatchToProps(dispatch){
	return {};
}

export default connect(stateToProps, dispatchToProps)(App);

