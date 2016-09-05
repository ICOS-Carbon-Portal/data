import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import NetCDFMap from '../components/NetCDFMap.jsx';
import colorMaker from '../models/colorMaker';
import config from '../config';

class FootprintContainer extends Component {
	constructor(props){
		super(props);
		this.state = {
			zoomToRaster: true,
			selectedGamma: 1
		};
	}

	componentWillReceiveProps(nextProps){
		const oldStation = this.props.selectedStation;
		const newStation = nextProps.selectedStation;

		const zoomToRaster = (!oldStation || !newStation || oldStation.id != newStation.id);

		//console.log('updating zoomToRaster to:', zoomToRaster);

		this.setState({zoomToRaster});
	}

	changeHandler(){
		const ddl = ReactDOM.findDOMNode(this.refs.gammaDdl);

		if (ddl.selectedIndex > 0){
			this.setState({selectedGamma: ddl.value});
		}
	}

	render() {
		const props = this.props;
		const state = this.state;
		// console.log({props, state});

		return (
			props.selectedStation
				? <div style={{height: 400}}>
					<NetCDFMap
						mapOptions={{
							maxBounds: [[33, -15],[73, 35]],
							center: [53, 10],
							zoom: 3
						}}
						countriesTopo={props.countriesTopo}
						raster={props.raster}
						colorMaker={colorMaker}
						zoomToRaster={true}
					/>
					<select ref="gammaDdl" value={state.selectedGamma} className="form-control" onChange={this.changeHandler.bind(this)}>
						<option key="gamma">Select gamma</option>
						{config.gammas.map(gamma => <option key={gamma} value={gamma}>{gamma}</option>)}
					</select>
				</div>
				: null
		);
	}
}

function stateToProps(state){
	return state;
}

export default connect(stateToProps)(FootprintContainer);


