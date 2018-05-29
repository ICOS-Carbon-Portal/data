import React, { Component } from 'react';
import LeafletMap from '../leaflet/LeafletMap';

export default class Map extends Component {
	constructor(props){
		super(props);

		this._mapElement = React.Children.only(this.props.children);
		this._leafletMap = undefined;
	}

	componentDidMount(){
		this._leafletMap = new LeafletMap(this._mapElement);
	}

	render(){
		return (
			<div>
				{this.props.children}
			</div>
		);
	}
}