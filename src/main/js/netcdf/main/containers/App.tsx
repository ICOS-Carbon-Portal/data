import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from '../components/Map';
import {selectService, selectVariable, selectDate, selectElevation, selectGamma, selectDelay, pushPlayButton,
	incrementRasterData, fetchTimeSerie, resetTimeserieData, selectColorRamp, setRangeFilter, failWithError} from '../actions';
import {AnimatedToasters} from 'icos-cp-toaster';
import { RangeFilter, State, TimeserieParams } from '../models/State';
import { NetCDFDispatch } from '../store';
import ErrorBoundary from '../components/ErrorBoundary';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type AppProps = StateProps & DispatchProps;

class App extends Component<AppProps> {
	constructor(props: AppProps){
		super(props);
	}

	render() {
		const props = this.props;

		if (props.toasterData) {
			return (
				<AnimatedToasters
					autoCloseDelay={null}
					fadeInTime={100}
					fadeOutTime={400}
					toasterData={props.toasterData}
					maxWidth={400}
				/>
			);
		}

		return (
			<ErrorBoundary failWithError={props.failWithError}>
				<Map
					isSites={props.isSites}
					isPIDProvided={props.isPIDProvided}
					minMax={props.minMax}
					fullMinMax={props.fullMinMax}
					legendLabel={props.legendLabel}
					colorMaker={props.colorMaker}
					controls={props.controls}
					variableEnhancer={props.variableEnhancer}
					countriesTopo={props.countriesTopo}
					dateChanged={props.dateChanged}
					delayChanged={props.delayChanged}
					elevationChanged={props.elevationChanged}
					gammaChanged={props.gammaChanged}
					colorRampChanged={props.colorRampChanged}
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
					rangeFilter={props.rangeFilter}
					setRangeFilter={props.setRangeFilter}
				/>
			</ErrorBoundary>
			
		);
	}
}

const stateToProps = (state: State) => {
	return state;
};

const dispatchToProps = (dispatch: NetCDFDispatch) => {
	return {
		serviceChanged: (newIdx: number) => dispatch(selectService(newIdx)),
		variableChanged: (newIdx: number) => dispatch(selectVariable(newIdx)),
		dateChanged: (newIdx: number) => dispatch(selectDate(newIdx)),
		elevationChanged: (newIdx: number) => dispatch(selectElevation(newIdx)),
		delayChanged: (newIdx: number) => dispatch(selectDelay(newIdx)),
		gammaChanged: (newIdx: number) => dispatch(selectGamma(newIdx)),
		increment: (direction: number) => dispatch(incrementRasterData(direction)),
		playPauseMovie: () => dispatch(pushPlayButton),
		fetchTimeSerie: (params: TimeserieParams) => dispatch(fetchTimeSerie(params)),
		resetTimeserieData: () => dispatch(resetTimeserieData),
		colorRampChanged: (newIdx: number) => dispatch(selectColorRamp(newIdx)),
		setRangeFilter: (rangeFilter: RangeFilter) => dispatch(setRangeFilter(rangeFilter)),
		failWithError: (error: Error) => dispatch(failWithError(error)),
	};
};

export default connect(stateToProps, dispatchToProps)(App);
