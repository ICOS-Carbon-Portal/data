import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {formatDate} from '../models/formatting';
import config from '../config';

const components = [config.wdcggColumns.slice(1)].concat(config.stiltResultColumns.slice(1));

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
		const self = this;
		const visibility = this.props.modelComponentsVisibility || {};

		return <div className="panel panel-default">
			<div className="panel-body">
				<ul className="list-group">
					<li className="list-group-item"><strong>Footprint: {presentFootprint(this.props.footprint)}</strong></li>
					<li className="list-group-item">{
						components.map(name =>
							<span key={name}>
								<input type="checkbox" checked={!!visibility[name]} onChange={self.changeHandler.bind(self, name)}/> <strong>{name} </strong>
							</span>
						)
					}</li>
				</ul>
			</div>
		</div>;
	}
}

function presentFootprint(fp){
	return fp ? formatDate(fp.date) : '?';
}
