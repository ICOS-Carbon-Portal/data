import React from 'react';
import { connect } from 'react-redux';
import copyprops from '../../../common/main/general/copyprops';
import colorMaker from '../models/colorMaker';
import NetCDFMap from '../components/NetCDFMap.jsx';
import NetCDFLegend from '../components/NetCDFLegend.jsx';
import {getLegend} from '../models/colorMaker';
import {incrementIfNeeded} from '../actions';

const FootprintContainer = props =>
<div>
	<NetCDFMap
		mapHeight="400"
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
		showStationPos={props.showStationPosition}
		renderCompleted={props.renderCompleted}
	/>
	<NetCDFLegend divWidth={props.divWidth} stripeHeight={20} getLegend={getLegend} />
</div>;

function stateToProps(state){
	return Object.assign({},
		copyprops(state.options, ['showStationPosition']),
		copyprops(state, ['countriesTopo', 'raster', 'selectedStation'])
	);
}

function dispatchToProps(dispatch){
	return {
		renderCompleted: () => dispatch(incrementIfNeeded)
	};
}

export default connect(stateToProps, dispatchToProps)(FootprintContainer);

