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
	}

	render() {
		const props = this.props;

		return (
			props.visible
				? <div style={{height: 400}}>
					<NetCDFMap
						mapOptions={{
							maxBounds: [[38, -20],[78, 40]],
							center: [53, 10],
							zoom: 3
						}}
						countriesTopo={props.countriesTopo}
						raster={props.raster}
						colorMaker={colorMaker}
						zoomToRaster={false}
					/>
				</div>
				: null
		);
	}
}

function stateToProps(state){
	let props = copyprops(state, ['countriesTopo', 'raster']);
	props.visible = !!state.selectedStation;
	return props;
}

export default connect(stateToProps)(FootprintContainer);

