import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from '../components/Map.jsx';
import {selectService, selectVariable, selectDate, selectElevation, selectGamma, selectDelay, pushPlayButton,
	incrementRasterData, fetchTimeSerie, resetTimeserieData} from '../actions.js';
import {AnimatedToasters} from 'icos-cp-toaster';

class App extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const props = this.props;

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
			isSites={props.isSites}
			isPIDProvided={props.isPIDProvided}
			services={props.services}
			colorMaker={props.colorMaker}
			controls={props.controls}
			countriesTopo={props.countriesTopo}
			dateChanged={props.dateChanged}
			delayChanged={props.delayChanged}
			elevationChanged={props.elevationChanged}
			gammaChanged={props.gammaChanged}
			increment={props.increment}
			playingMovie={props.playingMovie}
			playPauseMovie={props.playPauseMovie}
			rasterFetchCount={props.rasterFetchCount}
			raster={props.raster}
			rasterDataFetcher={props.rasterDataFetcher}
			serviceChanged={props.serviceChanged}
			title={props.title}
			variableChanged={props.variableChanged}
			initSearchParams={props.initSearchParams}
			fetchTimeSerie={props.fetchTimeSerie}
			timeserieData={props.timeserieData}
			latlng={props.latlng}
			showTSSpinner={props.showTSSpinner}
			resetTimeserieData={props.resetTimeserieData}
			isFetchingTimeserieData={props.isFetchingTimeserieData}
		/>;
};

const stateToProps = state => {
	return Object.assign({}, state);
};

const dispatchToProps = dispatch => {
	return {
		serviceChanged: newIdx => dispatch(selectService(newIdx)),
		variableChanged: newIdx => dispatch(selectVariable(newIdx)),
		dateChanged: newIdx => dispatch(selectDate(newIdx)),
		elevationChanged: newIdx => dispatch(selectElevation(newIdx)),
		delayChanged: newIdx => dispatch(selectDelay(newIdx)),
		gammaChanged: newIdx => dispatch(selectGamma(newIdx)),
		increment: direction => dispatch(incrementRasterData(direction)),
		playPauseMovie: () => dispatch(pushPlayButton),
		fetchTimeSerie: params => dispatch(fetchTimeSerie(params)),
		resetTimeserieData: () => dispatch(resetTimeserieData),
	};
};

export default connect(stateToProps, dispatchToProps)(App);
