import {
	getCountriesGeoJson, rasterFetcher, getVariablesAndDates, getServices,
	getTimeserie, getMetadata} from './backend';
import {logError} from "../../common/main/backend";
import config from '../../common/main/config';
//import { NetCDFDispatch, AppThunk } from './store';
import { defaultColormaps, defaultDelays, defaultGammas, State, TimeserieParams } from './models/State';
import type { ThunkAction } from '@reduxjs/toolkit';
import type { Action } from 'redux';
import { colorrampSelected, countriesFetched, dateSelected, delaySelected, errorOccurred, extraDimSelected,
	gammaSelected, incrementRaster, metadataFetched, pushPlay, rasterFetched,
	serviceSelected, serviceSet, servicesFetched,variablesAndDatesFetched, variableSelected } from './reducer';
import { getRasterRequest, getSelectedControl } from './models/ControlsHelper';
import { allColormaps } from './models/Colormap';

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  State,
  unknown,
  Action<string>
>;

export function fetchInitialData(): AppThunk { 
	return (dispatch, getState) => {
		const state = getState();

		const searchParams = state.initSearchParams;
		let gammaIdx = defaultGammas.values.findIndex(gamma => gamma === parseFloat(searchParams.gamma));
		gammaIdx = gammaIdx === -1 ? 4 : gammaIdx;
		let colorIdx = defaultColormaps.values.findIndex(color => color.name === searchParams.color);
		colorIdx = colorIdx === -1 ? 0 : colorIdx;

		const pathName = window.location.pathname;
		const sections = pathName.split('/');
		const pidIdx = sections.indexOf('netcdf') + 1;
		const pid = sections[pidIdx];

		dispatch(fetchCountriesTopo());
		dispatch(gammaSelected(gammaIdx));
		dispatch(colorrampSelected(colorIdx));

		if (state.isPIDProvided) {
			dispatch(fetchMetadata(pid));

			if (!pid) {
				dispatch(failWithError(new Error('The request is missing a pid')));
			} else {
				dispatch(setService(pid));
			}
		} else {
			dispatch(fetchServices());
		}
	}
}


export const failWithError = (error: Error): AppThunk => ((dispatch, getState) => {
	console.log(error);

	logError(config.previewTypes.NETCDF, error.message);
	dispatch(errorOccurred(error));
});

/*
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
*/
export const fetchMetadata: (pid: string) => AppThunk<void> = pid => dispatch => {
	getMetadata(pid).then(
		metadata => dispatch(metadataFetched(metadata)),
		err => dispatch(failWithError(err))
	)
}

export const fetchServices: () => AppThunk<void> = () => dispatch => {
	getServices().then(
		services => {
			dispatch(servicesFetched(services));
			dispatch(selectService(0));
		},
		err => dispatch(failWithError(err))
	);
};

export const fetchCountriesTopo: () => AppThunk<void> = () => dispatch => {
	console.log("action fetchCountriesTopo")
	getCountriesGeoJson().then(
		countriesTopo => dispatch(countriesFetched({timestamp: Date.now(), countriesTopo})),
		err => dispatch(failWithError(err))
	);
};

export const setService: (pid: string) => AppThunk<void> = pid => dispatch => {
	console.log("action setService")
	dispatch(serviceSet(pid));
	dispatch(fetchVariablesAndDates);
}

export const selectService: (idx: number) => AppThunk<void> = idx => dispatch => {
	dispatch(serviceSelected(idx));
	dispatch(fetchVariablesAndDates);
}

const fetchVariablesAndDates: AppThunk<void> = (dispatch, getState) => {
	console.log("action fetchVariablesAndDates")
	console.log(getState());
	const services = getState().controls.services;

	const service = getSelectedControl(services);
	if (service === null) {
		return;
	}

	getVariablesAndDates(service).then(
		({ variables, dates }) => {
			dispatch(variablesAndDatesFetched({service, variables, dates}));
		},
		err => dispatch(failWithError(err))
	);
};

/*
export const fetchTimeSerie = (params: TimeserieParams): AppThunk<void> => dispatch => {
	dispatch(fetchingTimeserie());

	const showSpinnerTimer = setTimeout(() => dispatch(toggleTsSpinner(true)), 300);

	getTimeserie(params).then(
		yValues => {
			clearTimeout(showSpinnerTimer);

			if (yValues.length > 0) {
				dispatch(toggleTsSpinner(false));
				dispatch(timeserieFetched({yValues, timeserieParams: params}));
			}
		},
		err => {
			clearTimeout(showSpinnerTimer)
			dispatch(failWithError(err))
		}
	)
}
*/
export const pushPlayButton: AppThunk<void> = (dispatch, getState) => {
	dispatch(pushPlay())
	dispatch(incrementIfNeeded)
}

export const incrementRasterData = (increment: number): AppThunk<void> => dispatch => {
	dispatch(incrementRaster(increment));
	//dispatch(fetchRasterData);
};

export const incrementIfNeeded: AppThunk<void> = (dispatch, getState) => {
	setTimeout(
		() => {
			if(getState().playingMovie) {
				dispatch(incrementRasterData(1));
			}
		},
		5
	)//a tiny delay to improve interface's responsiveness
};

export const selectVariable = (idx: number): AppThunk<void> => (dispatch, getState) => {
	dispatch(variableSelected(idx));
};

export const selectDate = (idx: number): AppThunk<void> => dispatch => {
	dispatch(dateSelected(idx));
};

export const selectExtraDim = (idx: number): AppThunk<void> => dispatch => {
	dispatch(extraDimSelected(idx));
};
