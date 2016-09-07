import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import NetCDFMap from '../components/NetCDFMap.jsx';
import colorMaker from '../models/colorMaker';
import config from '../config';
import copyprops from '../../../common/main/general/copyprops';

class FootprintContainer extends Component {
	constructor(props){
		super(props);
		this.state = {
			showStationPos: true
		}
	}

	showPosChanged(){
		const checkBox = ReactDOM.findDOMNode(this.refs.showStationPos);
		this.setState({showStationPos: checkBox.checked});
	}

	render() {
		const props = this.props;

		return (
			props.visible
				? <div style={{height: 400}}>
					<NetCDFMap
						mapOptions={{
							maxBounds: [[28, -20],[78, 40]],
							center: [53, 10],
							zoom: 3
						}}
						countriesTopo={props.countriesTopo}
						raster={props.raster}
						selectedStation={props.selectedStation}
						colorMaker={colorMaker}
						zoomToRaster={false}
						showStationPos={this.state.showStationPos}
					/>
					<div>
						<input ref="showStationPos" type="checkbox" onChange={this.showPosChanged.bind(this)} defaultChecked={true} />
						<span style={{marginLeft:7, position:'relative', top:-3}}>Show station position</span>
					</div>
				</div>
				: null
		);
	}
}

function stateToProps(state){
	let props = copyprops(state, ['countriesTopo', 'raster', 'selectedStation']);
	props.visible = !!state.selectedStation;
	return props;
}

export default connect(stateToProps)(FootprintContainer);

