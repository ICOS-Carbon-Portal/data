import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {formatDate} from '../models/formatting';
import config from '../config';


export default class ControlPanel extends Component {
	constructor(props){
		super(props);
	}

	changeHandler(name, event){
		if(this.props.updateVisibility){
			this.props.updateVisibility(name, event.target.checked);
		}
	}

	render(){
		return <div className="panel panel-default">
			<div className="panel-body">
				<ul className="list-group">
					<li className="list-group-item"><strong>Footprint: </strong>{presentFootprint(this.props.footprint)}</li>
					<li className="list-group-item"><strong>Primary Y-axis:</strong>{
						config.primaryComponents().map(this.stiltComponentSelector.bind(this))
					}</li>
					<li className="list-group-item"><strong>Secondary Y-axis:</strong>{
						config.secondaryComponents().map(this.stiltComponentSelector.bind(this))
					}</li>
				</ul>
			</div>
		</div>;
	}

	stiltComponentSelector({label, comment}){
		const visibility = this.props.modelComponentsVisibility || {};
		return <span key={label} title={comment} style={{marginLeft: 7}}>
			<input type="checkbox"
				checked={!!visibility[label]}
				onChange={this.changeHandler.bind(this, label)}
				style={{marginRight: 3}}
			/>
			{label}
		</span>;
	}
}

function presentFootprint(fp){
	return fp ? formatDate(fp.date) : '?';
}
