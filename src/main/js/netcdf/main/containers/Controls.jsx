import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Selector from '../components/Selector.jsx';
import {selectService, selectVariable, selectDate, selectElevation, selectGamma, selectDelay, pushPlayButton, incrementRasterData} from '../actions.js';

class Controls extends React.Component {
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const controls = props.controls;

		const elevationsStyle = controls.elevations.selected ? 'inline' : 'none';
		const playClass = "glyphicon glyphicon-" + (props.playingMovie ? 'pause' : 'play');
		const playTitle = props.playingMovie ? 'Pause playback' : 'Play';

		const toNext = () => props.increment(1);
		const toPrevious = () => props.increment(-1);

		return (
			<div className="row" style={{marginTop: props.marginTop, marginBottom: 10}}>
				<div className="col-md-3">
					<Selector className="services" caption="Data object" control={controls.services} action={props.serviceChanged}/>
				</div>

				<div className="col-md-2">
					<Selector className="variables" caption="Variable" control={controls.variables} action={props.variableChanged}/>
				</div>

				<div className="col-md-2">
					<Selector className="dates" caption="Date" control={controls.dates} action={props.dateChanged} />
				</div>

				<div className="col-md-1" style={{minWidth: 120}}>
					<div style={{fontWeight: 'bold'}}>Playback:</div>
					<div className="btn-group" style={{minWidth: 120}}>
						<button id="dateRev" className="btn btn-default" title="Reverse one time step" onClick={toPrevious}>
							<span className="glyphicon glyphicon-triangle-left"></span>
						</button>
						<button id="datePlayPause" className="btn btn-default" title={playTitle} onClick={props.playPauseMovie}>
							<span className={playClass}></span>
						</button>
						<button id="dateAdv" className="btn btn-default" title="Advance one time step" onClick={toNext}>
							<span className="glyphicon glyphicon-triangle-right"></span>
						</button>
					</div>
				</div>

				<div className="col-md-2">
					<Selector className="delays" caption="Playback delay" presenter={delayPresenter} control={controls.delays} action={props.delayChanged}/>
				</div>

				<div className="col-md-1" style={{display: elevationsStyle}}>
					<Selector className="elevations" caption="Elevations" control={controls.elevations} action={props.elevationChanged}/>
				</div>

				<div className="col-md-1">
					<Selector className="gammas" caption="Gamma" control={controls.gammas} action={props.gammaChanged}/>
				</div>
			</div>
		);
	}
}

function delayPresenter(delay){
	switch (delay){
		case 0 : return 'Fastest (processor-limited)';
		case 50 : return 'Very fast (up to 20 fps)';
		case 100 : return 'Fast (up to 10 fps)';
		case 200 : return 'Medium (up to 5 fps)';
		case 500 : return 'Medium (up to 2 fps)';
		case 1000 : return 'Slow (up to 1 fps)';
		case 3000 : return 'Very slow (0.33 fps)';
		default : return (1000 / delay) + ' fps';
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

		delayChanged(newIdx){
			dispatch(selectDelay(newIdx));
		},

		gammaChanged(newIdx){
			dispatch(selectGamma(newIdx));
		},

		increment(direction){
			dispatch(incrementRasterData(direction));
		},

		playPauseMovie(){
			dispatch(pushPlayButton);
		}
	};
}

export default connect(stateToProps, dispatchToProps)(Controls);

