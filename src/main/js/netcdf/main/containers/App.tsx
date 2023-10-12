import React, { Component } from 'react';
import { connect } from 'react-redux';
import Map from '../components/Map';
import {selectService, selectVariable, selectDate, selectExtraDim, selectGamma, selectDelay, pushPlayButton,
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

		return <React.Fragment>
			{props.toasterData
				? <AnimatedToasters autoClose={false} toasterData={props.toasterData} />
				: null
			}
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
					extraDimChanged={props.extraDimChanged}
					gammaChanged={props.gammaChanged}
					colorRampChanged={props.colorRampChanged}
					increment={props.increment}
					playingMovie={props.playingMovie}
					playPauseMovie={props.playPauseMovie}
					rasterFetchCount={props.rasterFetchCount}
					raster={props.raster}
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
		</React.Fragment>
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
		extraDimChanged: (newIdx: number) => dispatch(selectExtraDim(newIdx)),
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
