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
						<AxisControl title="Primary Y-axis" components={config.primaryComponents()} {...props} />
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


const StationAndYearSelector = ({selectYear, selectStation, selectedYear, selectedStation, stations}) => {
	const yearInfos = selectedStation ? selectedStation.years : [];

	return <div className="row">
		<div className="col-md-6">
			<Select
				selectValue={selectStation}
				infoTxt="Select station here or on the map"
				availableValues={stations}
				value={selectedStation}
				presenter={station => station.name}
			/>
		</div>
		<div className="col-md-6">
			<Select
				selectValue={selectYear}
				infoTxt="Select year"
				availableValues={yearInfos}
				value={selectedYear}
				presenter={yearInfo => yearInfo.year}
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

	const changeHandler = event => {
		if(updateStationVisibility){
			updateStationVisibility(event.target.checked);
		}
	}

	return <div className="row">
		<div className="col-md-6">
			<strong>Footprint: </strong>{status}
		</div>
		<div className="col-md-6">
			<input type="checkbox" onChange={changeHandler} checked={options.showStationPosition} />
			<span style={{marginLeft:7, position:'relative', top:-2}}>Show station position</span>
		</div>
	</div>;
}


const MovieControl = props => {

	const toNext = () => props.incrementFootprint(1);
	const toPrevious = () => props.incrementFootprint(-1);

	return <div className="input-group">
		<div className="input-group-btn">
			<button type="button" className="btn btn-default" onClick={toPrevious}>
				<span className="glyphicon glyphicon-triangle-left"></span>
			</button>
			<button type="button" className="btn btn-default" onClick={toNext}>
				<span className="glyphicon glyphicon-triangle-right"></span>
			</button>
		</div>
	</div>;
}

