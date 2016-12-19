import React, { Component } from 'react'
import { connect } from 'react-redux'
import Controls from './Controls.jsx';
import NetCDFMap from '../../../common/main/maps/NetCDFMap.jsx';
import NetCDFLegend from '../../../common/main/frontend/legend/NetCDFLegend.jsx';
import {AnimatedToasters} from '../../../common/main/frontend/toaster/Toaster.jsx';
import {RASTER_FETCHED, TOAST_RESET}from '../actions';

const marginTop = 10;
const legendWidth = 130;
const minHeight = 300;

class App extends Component {
	constructor(props){
		super(props);
		this.state = {
			busy: true,
			height: null
		};
	}

	componentWillReceiveProps(nextProps){
		nextProps.status === RASTER_FETCHED || nextProps.status === TOAST_RESET
			? this.setState({busy: false})
			: this.setState({busy: true});
	}

	updateDimensions(){
		this.setState({
			height: window.innerHeight - 100 - marginTop - 135
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
			? props.raster.id + '_' + props.controls.gammas.selected
			: "";

		const containerHeight = state.height < minHeight ? minHeight : state.height;

		return (
			<div>

				<AnimatedToasters
					autoCloseDelay={5000}
					fadeInTime={100}
					fadeOutTime={400}
					toasterData={props.toasterData}
					maxWidth={400}
				/>

				<div className="page-header">
					<h1>Spatial data visualization</h1>
				</div>

				<Controls marginTop={marginTop} />

				<div className="row">
					<div className="col-md-12" style={{display:'flex'}}>
						<div style={{height: state.height, flex: 100, minHeight}}>
							<NetCDFMap
								mapOptions={{
									zoom: 2,
									center: [13, 0]
								}}
								raster={props.raster}
								colorMaker={colorMaker}
								geoJson={props.countriesTopo}
								latLngBounds={getLatLngBounds(props.controls.services, props.controls.lastChangedControl, props.raster, props.status)}
							/>
						</div>
						<div style={{flex: legendWidth + 'px', minWidth: legendWidth, minHeight}}>{
							getLegend
								? <NetCDFLegend
								horizontal={false}
								canvasWidth={20}
								containerHeight={containerHeight}
								margin={7}
								getLegend={getLegend}
								legendId={legendId}
								legendText="Legend"
								decimals={3}
							/>
								: null
						}</div>
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

export default connect(stateToProps)(App);
