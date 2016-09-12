import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import config from '../config';

import {formatDate} from '../models/formatting';
import Select from './Select.jsx';
import StationsMap from './LMap.jsx';


export default class ControlPanel extends Component {
	constructor(props){
		super(props);
	}

	componentVisibilityChangeHandler(name, event){
		if(this.props.updateVisibility){
			this.props.updateVisibility(name, event.target.checked);
		}
	}

	stationVisibilityChangeHandler(event){
		if(this.props.updateStationVisibility){
			this.props.updateStationVisibility(event.target.checked);
		}
	}

	render(){
		const {selectYear, selectStation, selectedYear, selectedStation, stations} = this.props;
		const yearInfos = selectedStation ? selectedStation.years : [];

		return <div className="panel panel-default">
			<div className="panel-body">
				<div className="row">
						<div className="col-md-3">
							<div style={{height: 250}}>
								<StationsMap
									stations={stations}
									selectedStation={selectedStation}
									action={selectStation}
								/>
							</div>
						</div>
						<div className="col-md-9">
							<ul className="list-group">
								<li className="list-group-item">
									<div className="row">
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
									</div>
								</li>
								<li className="list-group-item">
									<div className="row">
										<div className="col-md-6">
											<strong>Footprint: </strong>{presentFootprint(this.props.footprint)}
										</div>
										<div className="col-md-6">
											<input type="checkbox" onChange={this.stationVisibilityChangeHandler.bind(this)} checked={this.props.options.showStationPosition} />
											<span style={{marginLeft:7, position:'relative', top:-2}}>Show station position</span>
										</div>
									</div>
								</li>
								<li className="list-group-item"><strong>Primary Y-axis:</strong>{
									config.primaryComponents().map(this.stiltComponentSelector.bind(this))
								}</li>
								<li className="list-group-item"><strong>Secondary Y-axis:</strong>{
									config.secondaryComponents().map(this.stiltComponentSelector.bind(this))
								}</li>
							</ul>
						</div>
				</div>
			</div>
		</div>;
	}

	stiltComponentSelector({label, comment}){
		const visibility = this.props.options.modelComponentsVisibility || {};
		return <span key={label} title={comment} style={{marginLeft: 7}}>
			<input type="checkbox"
				checked={!!visibility[label]}
				onChange={this.componentVisibilityChangeHandler.bind(this, label)}
				style={{marginRight: 3}}
			/>
			{label}
		</span>;
	}
}

function presentFootprint(fp){
	return fp ? formatDate(fp.date) : '?';
}

