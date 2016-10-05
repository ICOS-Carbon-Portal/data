import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Selector from '../components/Selector.jsx';
import {selectService, selectVariable, selectDate, selectElevation, selectGamma, RASTER_FETCHED} from '../actions.js';

class Controls extends React.Component {
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const controls = props.controls;

		return (
			<div className="row" style={{marginTop: props.marginTop}}>
				<div className="col-md-4">
					<Selector className="services" caption="Data object" control={controls.services} action={props.serviceChanged}/>
				</div>

				<div className="col-md-2">
					<Selector className="variables" caption="Variable" control={controls.variables} action={props.variableChanged}/>
				</div>

				<div className="col-md-2">
					<div className="form-group">
						<div className="input-group">
							{/*
							 <div className="input-group-addon button-s">
							 <button id="dateRev" className="form-control btn btn-primary" title="Reverse one time step">&lt;</button>
							 </div>
							 */}
							<Selector className="dates" caption="Date" control={controls.dates} action={props.dateChanged}/>
						</div>
					</div>
				</div>

				<div className="col-md-1">
					<Selector className="elevations" caption="Elevations" control={controls.elevations} action={props.elevationChanged}/>
				</div>
				<div className="col-md-1">
					<Selector className="gammas" caption="Gamma" control={controls.gammas} action={props.gammaChanged}/>
				</div>
			</div>
		);
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		serviceChanged(newIdx){
			dispatch(selectService(newIdx));
		},

		variableChanged(newIdx){
			dispatch(selectVariable(newIdx));
		},

		dateChanged(newIdx){
			dispatch(selectDate(newIdx));
		},

		elevationChanged(newIdx){
			dispatch(selectElevation(newIdx));
		},

		gammaChanged(newIdx){
			dispatch(selectGamma(newIdx));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Controls);

