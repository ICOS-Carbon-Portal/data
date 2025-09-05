import React, { useCallback } from 'react';
import Selector from './Selector';
import DropdownColors from "./DropdownColors";
import { ControlsHelper, getSelectedControl } from '../models/ControlsHelper';
import { VariableInfo } from '../backend';
import { useAppDispatch, useAppSelector } from '../store';
import { incrementRasterData } from '../actions';
import { colorrampSelected, dateSelected, delaySelected, extraDimSelected, gammaSelected, pushPlay, variableSelected } from '../reducer';

const btnCls = 'btn btn-outline-secondary';
const btnIconStyle = {fontSize: '150%', margin: 0, padding: 0};

type ControlsProps = {
	isPIDProvided: boolean
	marginTop: number
	variableEnhancer?: Record<string, string>
	playingMovie: boolean
	handleServiceChange: (newIdx: number) => void
	isRangeFilterInputsActive: boolean
	handleRangeFilterInputsChange: () => void
}

export default function Controls(props: ControlsProps) {
	function variablePresenter(v: VariableInfo) {
		const lbl = v.shortName;
		return props.variableEnhancer ? props.variableEnhancer[lbl] ?? lbl : lbl;
	}

	const dispatch = useAppDispatch();
 
	const controls = useAppSelector(state => state.controls);
	const { services, variables, dates, extraDim, gammas, delays } = controls;
	const colorMaps = useAppSelector(state => state.controls.colorMaps);

	const extraDimCaption = getSelectedControl(variables)?.extra?.name ?? "Extra dimension"
	const extraDimsStyle = getSelectedControl(extraDim) ? 'inline' : 'none';
	const playClass = `fas fa-${props.playingMovie ? 'pause' : 'play'}-circle`;
	const playTitle = props.playingMovie ? 'Pause playback' : 'Play';

	const rangeFilterInputsBtnCls = props.isRangeFilterInputsActive
		? 'fas fa-filter text-primary'
		: 'fas fa-filter';

	const toNext = () => dispatch(incrementRasterData(1));
	const toPrevious = () => dispatch(incrementRasterData(-1));
	const toggleMoviePlaying = () => dispatch(pushPlay());

	const ddColorChanged = useCallback((newIdx: number) => dispatch(colorrampSelected(newIdx)), []);

	return (
		<div className="d-flex gap-3 flex-wrap" style={{marginTop: props.marginTop, marginBottom: 10}}>
			{!props.isPIDProvided
				? <div>
					<Selector
						className="variables"
						caption="Services"
						presenter={v => v}
						control={services}
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
					control={variables}
					action={(newIdx) => dispatch(variableSelected(newIdx))}
				/>
			</div>

			<div style={{display: extraDimsStyle}}>
				<Selector
					caption={extraDimCaption}
					presenter={v => v}
					control={extraDim}
					action={(newIdx) => dispatch(extraDimSelected(newIdx))}
				/>
			</div>

			<div>
				<Selector
					className="dates"
					caption="Date"
					presenter={v => v}
					control={dates}
					action={(newIdx) => dispatch(dateSelected(newIdx))}
				/>
			</div>

			<div>
				<label className='form-label d-block fw-bold'>Playback</label>
				<div className="btn-group" style={{minWidth: 120}}>
					<button id="dateRev" className={btnCls} style={btnIconStyle} title="Reverse one time step" onClick={toPrevious}>
						<span className="fas fa-caret-left" />
					</button>
					<button id="datePlayPause" className={btnCls} style={btnIconStyle} title={playTitle} onClick={toggleMoviePlaying}>
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
					control={delays}
					action={(newIdx) => dispatch(delaySelected(newIdx))}
				/>
			</div>

			<div>
				<label className='form-label d-block fw-bold'>Colormap</label>
				<DropdownColors
					control={colorMaps}
					action={ddColorChanged}
				/>
			</div>

			<div>
				<Selector
					className="gammas"
					caption="Color gamma"
					presenter={v => v.toString(10)}
					control={gammas}
					action={(newIdx) => dispatch(gammaSelected(newIdx))}
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
