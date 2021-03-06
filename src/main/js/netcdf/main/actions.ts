import {
	getCountriesGeoJson, getRaster, getVariablesAndDates, getElevations, getServices, getTitle,
	getTimeserie, getMetadata} from './backend';
import {logError} from "../../common/main/backend";
import config from '../../common/main/config';
import { NetCDFDispatch, NetCDFThunkAction } from './store';
import {
	COLORRAMP_SELECTED, COUNTRIES_FETCHED, DATE_SELECTED, DELAY_SELECTED, ELEVATIONS_FETCHED, ELEVATION_SELECTED,
	ERROR, FETCHING_TIMESERIE, GAMMA_SELECTED, INCREMENT_RASTER, METADATA_FETCHED, PUSH_PLAY,
	RASTER_FETCHED, SERVICES_FETCHED, SERVICE_SELECTED, SERVICE_SET, SET_RANGEFILTER, TIMESERIE_FETCHED,
	TIMESERIE_RESET, TITLE_FETCHED, TOGGLE_TS_SPINNER, VARIABLES_AND_DATES_FETCHED, VARIABLE_SELECTED
} from './actionDefinitions';
import stateProps, { RangeFilter, TimeserieParams } from './models/State';

export const failWithError = (error: Error): NetCDFThunkAction<void> => dispatch => {
	console.log(error);

	logError(config.previewTypes.NETCDF, error.message);
	dispatch(new ERROR(error));
}

export const init = (dispatch: NetCDFDispatch) => {
	dispatch(fetchCountriesTopo);
	dispatch(selectGamma(stateProps.gammaIdx));
	dispatch(selectColorRamp(stateProps.colorIdx));

	if (stateProps.isPIDProvided) {
		dispatch(fetchMetadata(stateProps.pid));

		if (!window.frameElement) {
			dispatch(fetchTitle(stateProps.pid));
		}
		if (stateProps.pid) {
			dispatch(setService(stateProps.pid));
		} else {
			dispatch(failWithError(new Error('The request is missing a pid')));
		}
	} else {
		dispatch(fetchServices);
	}
};

export const fetchMetadata = (pid: string): NetCDFThunkAction<void> => dispatch => {
	getMetadata(pid).then(
		metadata => dispatch(new METADATA_FETCHED(metadata)),
		err => dispatch(failWithError(err))
	);
};

export const fetchServices: NetCDFThunkAction<void> = dispatch => {
	getServices().then(
		services => {
			dispatch(new SERVICES_FETCHED(services));
			dispatch(selectService(0));
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchTitle = (pid: string): NetCDFThunkAction<void> => dispatch => {
	getTitle(pid).then(
		title => dispatch(new TITLE_FETCHED(title)),
		err => dispatch(failWithError(err))
	);
};

export const fetchCountriesTopo: NetCDFThunkAction<void> = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => dispatch(new COUNTRIES_FETCHED(countriesTopo)),
		err => dispatch(failWithError(err))
	);
};

export const setService = (pid: string): NetCDFThunkAction<void> => dispatch => {
	dispatch(new SERVICE_SET([pid]));
	dispatch(fetchVariablesAndDates);
};

export const selectService = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new SERVICE_SELECTED(idx));
	dispatch(fetchVariablesAndDates);
};

const fetchVariablesAndDates: NetCDFThunkAction<void> = (dispatch, getState) => {
	const services = getState().controls.services;

	if(!services.hasSelected) return;

	getVariablesAndDates(services.selected).then(
		({ variables, dates }) => {
			dispatch(new VARIABLES_AND_DATES_FETCHED(services.selected, variables, dates));
			dispatch(fetchElevations);
		},
		err => dispatch(failWithError(err))
	);
};

const fetchElevations: NetCDFThunkAction<void> = (dispatch, getState) => {
	const controls = getState().controls;
	if(!controls.services.hasSelected || !controls.variables.hasSelected) return;

	getElevations(controls.services.selected, controls.variables.selected).then(
		elevations => {
			dispatch(new ELEVATIONS_FETCHED('elevations', elevations, controls));
			dispatch(fetchRaster);
		},
		err => dispatch(failWithError(err))
	);
};

const fetchRaster: NetCDFThunkAction<void> = (dispatch, getState) => {
	const controls = getState().controls;
	const {services, variables, dates, elevations} = controls;

	if(!services.hasSelected || !variables.hasSelected || !dates.hasSelected || !elevations.isLoaded) return;

	const elevation = elevations.hasSelected ? elevations.selected : null;

	getRaster(services.selected, variables.selected, dates.selected, elevation).then(
		raster => dispatch(new RASTER_FETCHED(raster, controls)),
		err => dispatch(failWithError(err))
	);
};

export const fetchTimeSerie = (params: TimeserieParams): NetCDFThunkAction<void> => dispatch => {
	dispatch(new FETCHING_TIMESERIE());

	const showSpinnerTimer = setTimeout(() => dispatch(new TOGGLE_TS_SPINNER(true)), 300);

	getTimeserie(params).then(yValues => {
		clearTimeout(showSpinnerTimer);

		if (yValues.length > 0) {
			dispatch(new TOGGLE_TS_SPINNER(false));
			dispatch(new TIMESERIE_FETCHED(yValues, params));
		}
	});
};

export const resetTimeserieData: NetCDFThunkAction<void> = dispatch => {
	dispatch(new TIMESERIE_RESET());
};

export const pushPlayButton: NetCDFThunkAction<void> = (dispatch, getState) => {
	if (!getState().rasterDataFetcher) return;

	dispatch(new PUSH_PLAY());
	dispatch(incrementIfNeeded);
};

export const incrementRasterData = (increment: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new INCREMENT_RASTER(increment));
	dispatch(fetchRasterData);
};

const fetchRasterData: NetCDFThunkAction<void> = (dispatch, getState) => {
	const state = getState();
	if(!state.desiredId) return;

	if (state.raster && state.raster.id === state.desiredId) {
		dispatch(incrementIfNeeded);
	} else {
		if (!state.rasterDataFetcher) return;
		
		state.rasterDataFetcher.fetch(state.controls.selectedIdxs).then(
			raster => {
				dispatch(new RASTER_FETCHED(raster, state.controls));
				dispatch(incrementIfNeeded);
			},
			err => dispatch(failWithError(err)));
	}
};

export const incrementIfNeeded: NetCDFThunkAction<void> = (dispatch, getState) => {
	setTimeout(() => {
		if(getState().playingMovie) {
			dispatch(incrementRasterData(1));
		}
	}, 5); //a tiny delay in hope to improve interface's responsiveness
};

export const selectVariable = (idx: number): NetCDFThunkAction<void> => (dispatch, getState) => {
	dispatch(new VARIABLE_SELECTED(idx));
	dispatch(fetchElevations);

	const {timeserieParams, controls} = getState();

	if (timeserieParams) {
		const params = Object.assign({}, timeserieParams, {variable: controls.variables.selected});
		dispatch(fetchTimeSerie(params));
	}
};

export const selectDate = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new DATE_SELECTED(idx));
	dispatch(fetchRaster);
};

export const selectElevation = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new ELEVATION_SELECTED(idx));
	dispatch(fetchRaster);
};

export const selectGamma = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new GAMMA_SELECTED(idx));
};

export const selectDelay = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new DELAY_SELECTED(idx));
};

export const selectColorRamp = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new COLORRAMP_SELECTED(idx));
};

export const setRangeFilter = (rangeFilter: RangeFilter): NetCDFThunkAction<void> => dispatch => {
	dispatch(new SET_RANGEFILTER(rangeFilter));
};
