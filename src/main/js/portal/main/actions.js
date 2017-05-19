export const ERROR = 'ERROR';
export const SPECTABLES_FETCHED = 'SPECTABLES_FETCHED';
export const META_QUERIED = 'META_QUERIED';
import config from '../../common/main/config';
import {fetchAllSpecTables, searchDobjs, searchStations} from './backend';

export function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}

export const getAllSpecTables = dispatch => {
	fetchAllSpecTables(config).then(
		specTables => {
			dispatch({
				type: SPECTABLES_FETCHED,
				specTables
			})
		}
	);
};


export const queryMeta = (id, search, minLength) => dispatch => {
	if (search.length >= minLength) {

		switch (id) {
			case "dobj":
				searchDobjs(config, search).then(data => dispatchMeta(id, data, dispatch));
				break;

			case "station":
				searchStations(config, search).then(data => dispatchMeta(id, data, dispatch));
				break;

			default:
				dispatch(failWithError({message: `Could not find a method matching ${id} to query metadata`}));
		}
	} else {
		dispatchMeta(id, undefined, dispatch);
	}
};

const dispatchMeta = (id, data, dispatch) => {
	dispatch({
		type: META_QUERIED,
		metadata: {
			id,
			data
		}
	});
};

