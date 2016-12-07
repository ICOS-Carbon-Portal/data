import React from 'react';
import ReactDOM from 'react-dom';

import config from '../config';

import {formatDate} from '../models/formatting';
import Select from './Select.jsx';
import StationsMap from './LMap.jsx';


export default props => <div className="panel panel-default">
	<div className="panel-body">
		<div className="row">
			<div className="col-md-3"><StationSelectingMap {...props} /></div>
			<div className="col-md-9">
				<ul className="list-group">
					<li className="list-group-item"><StationAndYearSelector {...props} /></li>
					<li className="list-group-item"><FootprintState {...props} /></li>
					<li className="list-group-item">
						<AxisControl title="Primary Y-axis" components={config.primaryComponents(props.selectedYear)} {...props} />
					</li>
					<li className="list-group-item">
						<AxisControl title="Secondary Y-axis" components={config.secondaryComponents()} {...props} />
					</li>
					<li className="list-group-item"><MovieControl {...props} /></li>
				</ul>
			</div>
		</div>
	</div>
</div>


const StationSelectingMap = ({stations, selectedStation, selectStation}) => {
	return <div style={{height: 300}}>
		<StationsMap
			stations={stations}
			selectedStation={selectedStation}
			action={selectStation}
		/>
	</div>;
}

function yearInfoToLabel(info){
	if(!info) return info;
	return info.year + (info.dataObject ? ' (+WDCGG)' : '');
}

const StationAndYearSelector = ({selectYear, selectStation, selectedYear, selectedStation, stations}) => {
	const yearInfos = selectedStation ? selectedStation.years : [];
	const yearsDisabled = !yearInfos.length;

	return <div className="row">
		<div className="col-md-6">
			<Select
				selectValue={selectStation}
				infoTxt="Select station here or on the map"
				availableValues={stations}
				value={selectedStation}
				presenter={station => station ? `${station.name} (${station.id})` : station}
				sort={true}
			/>
		</div>
		<div className="col-md-6">
			<Select
				selectValue={selectYear}
				infoTxt={yearsDisabled ? "Select station first" : "Select year"}
				availableValues={yearInfos}
				value={selectedYear}
				presenter={yearInfoToLabel}
				options={{disabled: yearsDisabled}}
			/>
		</div>
	</div>;
}


const AxisControl = props => {
	return <div>
		<strong>{props.title}:</strong>
		{props.components.map(
			(comp,i) => <StiltComponentSelector key={i} {...comp} {...props} />
		)}
	</div>;
}


const StiltComponentSelector = ({label, comment, updateVisibility, options}) => {
	const visibilityChangeHandler = event => {
		if(updateVisibility){
			updateVisibility(label, event.target.checked);
		}
	}

	const visibility = options.modelComponentsVisibility || {};

	return <span key={label} title={comment} style={{marginLeft: 7}}>
		<input type="checkbox"
			checked={!!visibility[label]}
			onChange={visibilityChangeHandler}
			style={{marginRight: 3, position: 'relative', top: 2}}
		/>
		{label}
	</span>;
}


const FootprintState = ({footprint, options, updateStationVisibility}) => {

	const status = footprint ? formatDate(footprint.date) : 'not loaded';

	return <div className="row">
		<div className="col-md-6">
			<strong>Footprint: </strong>{status}
		</div>
	</div>;
}


const MovieControl = props => {

	const toNext = () => props.incrementFootprint(1);
	const toPrevious = () => props.incrementFootprint(-1);

	const navDisabled = props.playingMovie || !props.footprint;

	const playClass = "glyphicon glyphicon-" + (props.playingMovie ? 'pause' : 'play');
	const playTitle = props.playingMovie ? 'Pause playback' : 'Play';

	return <div className="row">
		<div className="col-md-2">
			<strong>Playback</strong>
		</div>
		<div className="col-md-4">
			<div className="btn-group" style={{minWidth: 120}}>
				<button title="To previous footprint" type="button" className="btn btn-default" onClick={toPrevious} disabled={navDisabled}>
					<span className="glyphicon glyphicon-triangle-left"></span>
				</button>
				<button title={playTitle} type="button" className="btn btn-default" onClick={props.pushPlay} disabled={!props.footprint}>
					<span className={playClass}></span>
				</button>
				<button  title="To next footprint" type="button" className="btn btn-default" onClick={toNext} disabled={navDisabled}>
					<span className="glyphicon glyphicon-triangle-right"></span>
				</button>
			</div>
		</div>
		<div className="col-md-2">
			<strong>Playback speed</strong>
		</div>
		<div className="col-md-4">
			<Select
				selectValue={props.setDelay}
				infoTxt="Select playback speed"
				availableValues={delayValues}
				value={props.movieDelay}
				presenter={delayPresenter}
				options={{disabled: !props.footprint}}
			/>
		</div>
	</div>;
}

const delayValues = [0, 50, 100, 200, 500, 1000, 3000];
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

