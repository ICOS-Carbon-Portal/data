import React, { Component } from 'react';
import Selector from './Selector.jsx';
import DropdownColors from "./DropdownColors";

const btnCls = 'btn btn-outline-secondary';
const btnIconStyle = {fontSize: '150%', margin: 0, padding: 0};

export default class Controls extends Component {
	constructor(props){
		super(props);

		this.state = {
			colorRamps: []
		};
	}

	variablePresenter(key){
		return this.props.variableEnhancer[key] ?? key;
	}

	render(){
		const props = this.props;
		const controls = props.controls;

		const elevationsStyle = controls.elevations.selected ? 'inline' : 'none';
		const playClass = `fas fa-${props.playingMovie ? 'pause' : 'play'}-circle`;
		const playTitle = props.playingMovie ? 'Pause playback' : 'Play';

		const rangeFilterInputsBtnCls = props.isRangeFilterInputsActive
			? 'fas fa-filter text-primary'
			: 'fas fa-filter';

		const toNext = () => props.increment(1);
		const toPrevious = () => props.increment(-1);

		return (
			<div className="row" style={{marginTop: props.marginTop, marginBottom: 10}}>
				{!props.isPIDProvided
					? <div className="col-md-3">
						<Selector className="variables" caption="Services" control={controls.services} action={props.handleServiceChange}/>
					</div>
					: null
				}
				<div className={getClassName(2, props.isPIDProvided)}>
					<Selector className="variables" caption="Variable" presenter={this.variablePresenter.bind(this)} control={controls.variables} action={props.handleVarNameChange}/>
				</div>

				<div className={getClassName(2, props.isPIDProvided)}>
					<Selector className="dates" caption="Date" control={controls.dates} action={props.handleDateChange} />
				</div>

				<div className="col-md-1" style={{minWidth: 120}}>
					<div style={{fontWeight: 'bold'}}>Playback:</div>
					<div className="btn-group" style={{minWidth: 120}}>
						<button id="dateRev" className={btnCls} style={btnIconStyle} title="Reverse one time step" onClick={toPrevious}>
							<span className="fas fa-caret-left" />
						</button>
						<button id="datePlayPause" className={btnCls} style={btnIconStyle} title={playTitle} onClick={props.playPauseMovie}>
							<span className={playClass} />
						</button>
						<button id="dateAdv" className={btnCls} style={btnIconStyle} title="Advance one time step" onClick={toNext}>
							<span className="fas fa-caret-right"/>
						</button>
					</div>
				</div>

				<div className="col-md-1" style={{ minWidth: 145 }}>
					<Selector className="delays" caption="Playback speed" presenter={delayPresenter} control={controls.delays} action={props.delayChanged}/>
				</div>

				<div className="col-md-1" style={{display: elevationsStyle}}>
					<Selector className="elevations" caption="Elevations" control={controls.elevations} action={props.handleElevationChange}/>
				</div>

				<div className="col-md-1" style={{minWidth: 190}}>
					<div style={{ fontWeight: 'bold' }}>Map color:</div>
					<DropdownColors control={controls.colorRamps} action={props.handleColorRampChange} />
				</div>

				<div className="col-md-1" style={{ minWidth: 110 }}>
					<Selector className="gammas" caption="Shift color" control={controls.gammas} action={props.handleGammaChange} />
				</div>

				<div className="col-md-1">
					<div style={{fontWeight: 'bold'}}>Range:</div>
					<button className={btnCls} onClick={props.handleRangeFilterInputsChange}>
						<span className={rangeFilterInputsBtnCls} />
					</button>
				</div>
			</div>
		);
	}
}

const getClassName = (defaultWidth, isPIDProvided) => {
	const width = isPIDProvided ? defaultWidth : defaultWidth - 1;
	return 'col-md-' + width;
};

function delayPresenter(delay){
	switch (delay){
		case 0 : return 'Fastest';
		case 50 : return 'Very fast';
		case 100 : return 'Fast';
		case 200 : return 'Medium';
		case 500 : return 'Medium';
		case 1000 : return 'Slow';
		case 3000 : return 'Very slow';
		default : return (1000 / delay) + ' fps';
	}
}
