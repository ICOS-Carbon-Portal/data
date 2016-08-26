import React, { Component } from 'react';
import { connect } from 'react-redux';
import StationsMap from '../components/StationsMap.jsx';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		return (
			<div className="container-fluid">
				<div className="row">

					<div className="col-md-6">
						<div className="row">
							<div className="col-md-12">
								<div style={{height: 400}}>
									<StationsMap stations={this.props.stations} />
								</div>
							</div>
						</div>

						<div className="row">
							<div className="col-md-12">
								Footprint
							</div>
						</div>
					</div>

					<div className="col-md-6">
						<div className="row">
							<div className="col-md-12">
								Observations and Transport model
							</div>
						</div>
					</div>

				</div>
			</div>
		);
	}
}

function stateToProps(state){
	return state;
}

export default connect(stateToProps)(App);

