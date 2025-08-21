import React, { useState } from 'react';
import Selector from './Selector.jsx';
import DropdownColors from "./DropdownColors.jsx";
import { ControlsHelper } from '../models/ControlsHelper.js';
import { VariableInfo } from '../backend.js';

const btnCls = 'btn btn-outline-secondary';
const btnIconStyle = {fontSize: '150%', margin: 0, padding: 0};

type ControlsProps = {
	isPIDProvided: boolean
	marginTop: number
	controls: ControlsHelper
	variableEnhancer: Record<string, string>
	playingMovie: boolean
	increment: (direction: number) => void
	playPauseMovie: () => void
	delayChanged: (newIdx: number) => void
	handleServiceChange: (newIdx: number) => void
	handleVarNameChange: (newIdx: number) => void
	handleDateChange: (newIdx: number) => void
	handleGammaChange: (newIdx: number) => void
	handleExtraDimChange: (newIdx: number) => void
	handleColorRampChange: (newIdx: number) => void
	isRangeFilterInputsActive: boolean
	handleRangeFilterInputsChange: () => void
}

export default function Controls(props: ControlsProps) {
	const [colorRamps, setColorRamps] = useState([]);

	function variablePresenter(v: VariableInfo) {
		const lbl = typeof v === "string" ? v : v.shortName;
		return (props.variableEnhancer && props.variableEnhancer[lbl]) ?? lbl;
	}
 
	const controls = props.controls;

	const extraDimCaption = controls.variables.selected?.extra?.name ?? "Extra dimension"
	const extraDimsStyle = controls.extraDim.selected ? 'inline' : 'none';
	const playClass = `fas fa-${props.playingMovie ? 'pause' : 'play'}-circle`;
	const playTitle = props.playingMovie ? 'Pause playback' : 'Play';

	const rangeFilterInputsBtnCls = props.isRangeFilterInputsActive
		? 'fas fa-filter text-primary'
		: 'fas fa-filter';

	const toNext = () => props.increment(1);
	const toPrevious = () => props.increment(-1);

	return (
		<div className="d-flex gap-3 flex-wrap" style={{marginTop: props.marginTop, marginBottom: 10}}>
			{!props.isPIDProvided
				? <div>
					<Selector
						className="variables"
						caption="Services"
						presenter={v => v}
						control={controls.services}
						action={props.handleServiceChange}
					/>
				</div>
				: null
			}
			<div>
				<Selector
					className="variables"
					caption="Variable"
					presenter={variablePresenter}
					control={controls.variables}
					action={props.handleVarNameChange}
				/>
			</div>

			<div style={{display: extraDimsStyle}}>
				<Selector
					caption={extraDimCaption}
					presenter={v => v}
					control={controls.extraDim}
					action={props.handleExtraDimChange}
				/>
			</div>

			<div>
				<Selector
					className="dates"
					caption="Date"
					presenter={v => v}
					control={controls.dates}
					action={props.handleDateChange}
				/>
			</div>

			<div>
				<label className='form-label d-block fw-bold'>Playback</label>
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

			<div>
				<Selector
					className="delays"
					caption="Playback speed"
					presenter={delayPresenter}
					control={controls.delays}
					action={props.delayChanged}
				/>
			</div>

			<div>
				<label className='form-label d-block fw-bold'>Colormap</label>
				<DropdownColors
					control={controls.colorMaps}
					action={props.handleColorRampChange}
				/>
			</div>

			<div>
				<Selector
					className="gammas"
					caption="Color gamma"
					presenter={v => v.toString(10)}
					control={controls.gammas}
					action={props.handleGammaChange}
				/>
			</div>

			<div>
				<label className='form-label d-block fw-bold'>Range</label>
				<button className={btnCls} onClick={props.handleRangeFilterInputsChange}>
					<span className={rangeFilterInputsBtnCls} />
				</button>
			</div>
		</div>
	);
}

const getClassName = (defaultWidth: number, isPIDProvided: boolean) => {
	const width = isPIDProvided ? defaultWidth : defaultWidth - 1;
	return 'col-md-' + width;
};

function delayPresenter(delay: number) {
	switch (delay){
		case 0 : return 'Fastest (cpu/network limit)';
		case 50 : return 'Very fast (up to 20 fps)';
		case 100 : return 'Fast (up to 10 fps)';
		case 200 : return 'Medium (5 fps)';
		case 500 : return 'Medium (2 fps)';
		case 1000 : return 'Slow (1 fps)';
		case 3000 : return 'Very slow (0.33 fps)';
		default : return (1000 / delay) + ' fps';
	}
}
