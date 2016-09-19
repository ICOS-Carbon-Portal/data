import React, { Component } from 'react';
import { connect } from 'react-redux';
import copyprops from '../../../common/main/general/copyprops';
import colorMaker from '../models/colorMaker';
import NetCDFMap from '../components/NetCDFMap.jsx';
import NetCDFLegend from '../components/NetCDFLegend.jsx';
import {getLegend} from '../models/colorMaker';
import {incrementIfNeeded} from '../actions';
import {polygonMask} from '../../../common/main/maps/LeafletCommon';

const containerHeight = 400;

export class FootprintContainer extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		const props = this.props;

		return(
			<div ref="container" style={{display:'flex'}}>
				<div style={{height: containerHeight, flex: 100}}>
					<NetCDFMap
						mapHeight={containerHeight}
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
						addMask={polygonMask}
					/>
				</div>
				<div  style={{flex: '65px', minWidth:65}}>
					<NetCDFLegend
						horizontal={false}
						canvasWidth={20}
						containerHeight={containerHeight}
						margin={5}
						getLegend={getLegend}
					/>
				</div>
			</div>
		);
	}
}

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

