import React, { Component } from 'react'
import { connect } from 'react-redux'
import Controls from './Controls.jsx';
import NetCDFMap from '../../../common/main/maps/NetCDFMap.jsx';
import NetCDFLegend from '../../../common/main/maps/NetCDFLegend.jsx';
import {ERROR, RASTER_FETCHED, RASTER_VALUE_RECEIVED, setRasterVal}from '../actions';
import * as LCommon from '../../../common/main/maps/LeafletCommon';

const marginTop = 10;

class App extends Component {
	constructor(props){
		super(props);
		this.state = {
			busy: true,
			width: null,
			height: null
		};
	}

	componentWillReceiveProps(nextProps){
		nextProps.status === RASTER_FETCHED || nextProps.status === RASTER_VALUE_RECEIVED
			? this.setState({busy: false})
			: this.setState({busy: true});
	}

	updateDimensions(){
		this.setState({
			width: window.innerWidth - 30,
			//155: empirical, 147: top header height
			height: window.innerHeight - 155 - marginTop - 147
		});
	}

	componentWillMount(){
		this.updateDimensions();
	}

	componentDidMount(){
		window.addEventListener("resize", this.updateDimensions.bind(this));
	}

	componentWillUnmount(){
		window.removeEventListener("resize", this.updateDimensions.bind(this));
	}


	render() {
		const state = this.state;
		const props = this.props;
		const colorMaker = props.colorMaker ? props.colorMaker.makeColor.bind(props.colorMaker) : null;
		const getLegend = props.colorMaker ? props.colorMaker.getLegend.bind(props.colorMaker) : null;

		const busyStyle = state.busy
			? {
				position: 'absolute',
				top: Math.floor(window.innerHeight / 2),
				left: Math.floor(window.innerWidth / 2),
				zIndex: 99
			}
			: {display: 'none'};

		const legendId = props.raster
			? props.raster.id + '_' + props.controls.gammas.selected + '_' + state.width
			: "";

		return (
			<div>

				<Controls marginTop={marginTop} />

				<div className="row">
					<div className="col-md-12">
						<div style={{height: 70}}>{
							getLegend
								? <NetCDFLegend
									horizontal={true}
									canvasWidth={20}
									margin={30}
									getLegend={getLegend}
									decimals={2}
									legendText="Legend"
									legendId={legendId}
									rasterVal={props.rasterVal}
								/>
								: null
						}</div>
					</div>
				</div>

				<div className="row">
					<div className="col-md-12">
						<div style={{width: state.width, height: state.height, margin: '0 auto'}}>
							<NetCDFMap
								mapOptions={{
									zoom: 2,
									center: [13, 0]
								}}
								raster={props.raster}
								colorMaker={colorMaker}
								geoJson={props.countriesTopo}
								latLngBounds={getLatLngBounds(props.controls.services, props.controls.lastChangedControl, props.raster, props.status)}
								mouseOverCB={props.mouseOverCB}
								controls={[new LCommon.CoordViewer({decimals: 2})]}
							/>
						</div>
					</div>
				</div>

				<img src="https://static.icos-cp.eu/images/ajax-loader.gif" style={busyStyle} />
			</div>
		);
	}
}

function getLatLngBounds(services, lastChangedControl, raster, status){
	return status === RASTER_FETCHED && services && lastChangedControl == "services"
		? L.latLngBounds(
			L.latLng(raster.boundingBox.latMin, raster.boundingBox.lonMin),
			L.latLng(raster.boundingBox.latMax, raster.boundingBox.lonMax)
		)
		: null;
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		mouseOverCB(val){
			dispatch(setRasterVal(val));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(App);