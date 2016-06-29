import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

export default class LMap extends Component{
	constructor(props){
		super(props);
	}

	componentDidMount() {
		console.log({props: this.props});
		const topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: 14
		});

		const map = this.map = L.map(ReactDOM.findDOMNode(this.refs.map), {
			layers: [topo],
			attributionControl: false,
			maxBounds: [[-90, -180],[90, 180]]
		});

		map.setView([20, 0], 3);
	}

	componentWillReceiveProps(nextProps){
		console.log({nextProps});
	}

	shouldComponentUpdate(){
		return false;
	}

	componentWillUnmount() {
		this.map.off('click', this.onMapClick);
		this.map = null;
	}

	render() {
		return (
			<div ref='map' className='map'></div>
		);
	}
}