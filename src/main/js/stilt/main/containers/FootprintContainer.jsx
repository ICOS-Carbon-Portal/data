import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import copyprops from '../../../common/main/general/copyprops';
import colorMaker from '../models/colorMaker';
import NetCDFMap from '../components/NetCDFMap.jsx';
import NetCDFLegend from '../components/NetCDFLegend.jsx';

const FootprintContainer = props => <div>
	<div style={{height: 400}}>
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
			showStationPos={props.showStationPosition}
		/>
	</div>
	<NetCDFLegend width={400} height={20} />
</div>;

function stateToProps(state){
	return Object.assign({},
		copyprops(state.options, ['showStationPosition']),
		copyprops(state, ['countriesTopo', 'raster', 'selectedStation'])
	);
}

export default connect(stateToProps)(FootprintContainer);

