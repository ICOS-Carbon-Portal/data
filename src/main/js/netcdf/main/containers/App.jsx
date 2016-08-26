import React, { Component } from 'react'
import { connect } from 'react-redux'
import Controls from './Controls.jsx';
import Legend from '../views/LegendViewFactory.jsx';
import LMap from '../views/LMap.jsx';
import {ERROR, COUNTRIES_FETCHED, SERVICES_FETCHED, VARIABLES_FETCHED, DATES_FETCHED, ELEVATIONS_FETCHED, CTRL_HELPER_UPDATED, RASTER_FETCHED,
	SERVICE_SELECTED, VARIABLE_SELECTED, DATE_SELECTED, ELEVATION_SELECTED, GAMMA_SELECTED} from '../actions';

class App extends Component {
	constructor(props){
		super(props);
		this.state = {
			busy: true
		};
	}

	componentWillReceiveProps(nextProps){
		nextProps.status === RASTER_FETCHED
			? this.setState({busy: false})
			: this.setState({busy: true});
	}

	updateDimensions(){
		this.setState({
			width: window.innerWidth - 30,
			height: window.innerHeight - 130
		});
	}

	componentWillMount(){
		this.updateDimensions();
	}

	componentDidMount(){
		window.addEventListener("resize", this.updateDimensions.bind(this));
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.updateDimensions.bind(this));
	}


	render() {
		const state = this.state;
		const props = this.props;
		const gamma = props.controls
			? props.controls.gammas.values[props.controls.gammas.selectedIdx]
			: undefined;
		const busyStyle = state.busy
			? {
				position: 'absolute',
				top: Math.floor(state.height / 2),
				left: Math.floor(state.width / 2),
				zIndex: 99
			}
			: {display: 'none'};

		// console.log({state, props, gamma, lastCtrl: props.controls.lastChangedControl});

		return (
			<div className="container-fluid">

				<Controls />

				<div className="row">
					<div className="col-md-12">
						<div style={{height: 45}} />
					</div>
				</div>

				<div className="row">
					<div className="col-md-12">
						<div style={{width: state.width, height: state.height, margin: '0 auto'}}>
							<LMap
								raster={props.raster}
								gamma={gamma}
								countriesTopo={props.countriesTopo}
							/>
						</div>
					</div>
				</div>

				<img src="https://static.icos-cp.eu/images/ajax-loader.gif" style={busyStyle} />
			</div>
		);
	}
}

function rasterUpdated(raster){
	console.log({raster});
}

function stateToProps(state){
	return Object.assign({}, state);
}

export default connect(stateToProps)(App);