import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from '../components/Map.jsx';
import {selectVariable, selectDate, selectElevation, selectGamma, selectDelay, pushPlayButton, incrementRasterData} from '../actions.js';
import {AnimatedToasters} from 'icos-cp-toaster';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;
		// console.log({AppProps: props});

		return <AppDiv {...props} />;
	}
}

const AppDiv = props => {
	return props.toasterData
		? <AnimatedToasters
			autoCloseDelay={null}
			fadeInTime={100}
			fadeOutTime={400}
			toasterData={props.toasterData}
			maxWidth={400}
		/>
		: <Map
			colorMaker={props.colorMaker}
			controls={props.controls}
			countriesTopo={props.countriesTopo}
			dateChanged={props.dateChanged}
			delayChanged={props.delayChanged}
			elevationChanged={props.elevationChanged}
			gammaChanged={props.gammaChanged}
			increment={props.increment}
			params={props.params}
			playPauseMovie={props.playPauseMovie}
			raster={props.raster}
			rasterDataFetcher={props.rasterDataFetcher}
			variableChanged={props.variableChanged}
		/>;
}

const stateToProps = state => {
	return Object.assign({}, state);
};

const dispatchToProps = dispatch => {
	return {
		variableChanged: newIdx => dispatch(selectVariable(newIdx)),
		dateChanged: newIdx => dispatch(selectDate(newIdx)),
		elevationChanged: newIdx => dispatch(selectElevation(newIdx)),
		delayChanged: newIdx => dispatch(selectDelay(newIdx)),
		gammaChanged: newIdx => dispatch(selectGamma(newIdx)),
		increment: direction => dispatch(incrementRasterData(direction)),
		playPauseMovie: () => dispatch(pushPlayButton)
	};
};

export default connect(stateToProps, dispatchToProps)(App);
