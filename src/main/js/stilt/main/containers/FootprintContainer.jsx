import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import NetCDFMap from '../components/NetCDFMap.jsx';
import config from '../config';

class FootprintContainer extends Component {
	constructor(props){
		super(props);
		this.state = {
			zoomToRaster: true,
			selectedGamma: 0.1
		};
	}

	componentWillReceiveProps(nextProps){
		const prevProps = this.props;
		const state = this.state;

		const zoomToRaster = (prevProps.selectedStation != nextProps.selectedStation);
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
			<div style={{height: 400}}>
				<NetCDFMap
					mapOptions={{}}
					countriesTopo={props.countriesTopo}
					raster={props.raster}
					gamma={state.selectedGamma}
					zoomToRaster={true}
				/>
				<select ref="gammaDdl" value={state.selectedGamma} className="form-control" onChange={this.changeHandler.bind(this)}>
					<option key="gamma">Select gamma</option>
					{config.gammas.map(gamma => <option key={gamma} value={gamma}>{gamma}</option>)}
				</select>
			</div>
		);
	}
}

function stateToProps(state){
	return state;
}

export default connect(stateToProps)(FootprintContainer);


