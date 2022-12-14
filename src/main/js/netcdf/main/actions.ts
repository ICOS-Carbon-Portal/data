import {
	getCountriesGeoJson, rasterFetcher, getVariablesAndDates, getElevations, getServices,
	getTimeserie, getMetadata, getRasterId} from './backend';
import {logError} from "../../common/main/backend";
import config from '../../common/main/config';
import { NetCDFDispatch, NetCDFThunkAction } from './store';
import {
	COLORRAMP_SELECTED, COUNTRIES_FETCHED, DATE_SELECTED, DELAY_SELECTED, ELEVATIONS_FETCHED, ELEVATION_SELECTED,
	ERROR, FETCHING_TIMESERIE, GAMMA_SELECTED, INCREMENT_RASTER, METADATA_FETCHED, PUSH_PLAY,
	RASTER_FETCHED, SERVICES_FETCHED, SERVICE_SELECTED, SERVICE_SET, SET_RANGEFILTER, TIMESERIE_FETCHED,
	TIMESERIE_RESET, TOGGLE_TS_SPINNER, VARIABLES_AND_DATES_FETCHED, VARIABLE_SELECTED
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

		if (stateProps.pid) {
			dispatch(setService(stateProps.pid));
		} else {
			dispatch(failWithError(new Error('The request is missing a pid')));
		}
	} else {
		dispatch(fetchServices);
	}
};

export const fetchMetadata: (pid: string) => NetCDFThunkAction<void> = pid => dispatch => {
	getMetadata(pid).then(
		metadata => dispatch(new METADATA_FETCHED(metadata)),
		err => dispatch(failWithError(err))
	)
}

export const fetchServices: NetCDFThunkAction<void> = dispatch => {
	getServices().then(
		services => {
			dispatch(new SERVICES_FETCHED(services));
			dispatch(selectService(0));
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchCountriesTopo: NetCDFThunkAction<void> = dispatch => {
	getCountriesGeoJson().then(
		countriesTopo => dispatch(new COUNTRIES_FETCHED(countriesTopo)),
		err => dispatch(failWithError(err))
	);
};

export const setService: (pid: string) => NetCDFThunkAction<void> = pid => dispatch => {
	dispatch(new SERVICE_SET(pid))
	dispatch(fetchVariablesAndDates);
}

export const selectService: (idx: number) => NetCDFThunkAction<void> = idx => dispatch => {
	dispatch(new SERVICE_SELECTED(idx));
	dispatch(fetchVariablesAndDates);
}

const fetchVariablesAndDates: NetCDFThunkAction<void> = (dispatch, getState) => {
	const services = getState().controls.services;

	const service = services.selected
	if(service === null) return

	getVariablesAndDates(service).then(
		({ variables, dates }) => {
			dispatch(new VARIABLES_AND_DATES_FETCHED(service, variables, dates));
			dispatch(fetchElevations);
		},
		err => dispatch(failWithError(err))
	);
};

const fetchElevations: NetCDFThunkAction<void> = (dispatch, getState) => {
	const {services, variables} = getState().controls;
	const service = services.selected
	const variable = variables.selected
	if(service === null || variable === null) return

	getElevations(service, variable).then(
		elevations => {
			dispatch(new ELEVATIONS_FETCHED(service, variable, elevations));
			dispatch(fetchRasterData);
		},
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
	dispatch(new PUSH_PLAY())
	dispatch(incrementIfNeeded)
}

export const incrementRasterData = (increment: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new INCREMENT_RASTER(increment));
	dispatch(fetchRasterData);
};

const fetchRasterData: NetCDFThunkAction<void> = (dispatch, getState) => {
	const {controls, playingMovie} = getState()

	const request = controls.rasterRequest
	if(request === undefined) return

	const delay = playingMovie ? (controls.delays.selected ?? 200) : 0

	rasterFetcher.fetch(request, delay).then(
		raster => {
			dispatch(new RASTER_FETCHED(raster));
			dispatch(incrementIfNeeded);
		},
		err => dispatch(failWithError(err))
	)
}

export const incrementIfNeeded: NetCDFThunkAction<void> = (dispatch, getState) => {
	setTimeout(
		() => {
			if(getState().playingMovie) {
				dispatch(incrementRasterData(1));
			}
		},
		5
	)//a tiny delay to improve interface's responsiveness
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
	dispatch(fetchRasterData);
};

export const selectElevation = (idx: number): NetCDFThunkAction<void> => dispatch => {
	dispatch(new ELEVATION_SELECTED(idx));
	dispatch(fetchRasterData);
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
