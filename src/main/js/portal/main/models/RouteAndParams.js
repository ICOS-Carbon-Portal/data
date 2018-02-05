import config from '../config';
import {varType} from '../utils';


export default class RouteAndParams{
	constructor(route, filters){
		this._route = route;
		this._filters = filters || {};
	}

	withRoute(route){
		return new RouteAndParams(route, this._filters);
	}

	withFilter(varName, values){
		return new RouteAndParams(this._route, Object.assign(this._filters, {[varName]: values}));
	}

	withResetFilters(){
		const filtersToKeep = {};
		if (this._filters.filterTemporal) filtersToKeep.filterTemporal = this._filters.filterTemporal;

		return new RouteAndParams(this._route, filtersToKeep);
	}

	get route(){
		return this._route;
	}

	get filters(){
		return this._filters;
	}

	get urlPart(){
		// Don not add filters that are empty
		const newFilters = Object.keys(this._filters).reduce((acc, key) => {
			const variableType = varType(this._filters[key]);

			if (variableType === 'object' && Object.keys(this._filters[key]).length){
				acc[key] = this._filters[key];
			} else if (variableType === 'array' && this._filters[key].length){
				acc[key] = this._filters[key];
			} else if (variableType === 'string'){
				acc[key] = this._filters[key];
			}

			return acc;
		}, {});

		const filterKeys = Object.keys(newFilters);

		return filterKeys.length
			? this._route + '?' + filterKeys.map(key =>
				key + '=' + encodeURIComponent(JSON.stringify(newFilters[key]))).join('&')
			: this._route;
	}
}

export const restoreRouteAndParams = routeAndParams => {
	const urlParts = routeAndParams.split('?');
	const route = urlParts[0];
	const filters = urlParts[1]
		? urlParts[1].split('&').reduce((acc, keyVal) => {
			const param = keyVal.split('=');
			acc[param[0]] = JSON.parse(decodeURIComponent(param[1]));
			return acc;
		}, {})
		: {};

	return new RouteAndParams(route || config.DEFAULT_ROUTE, filters);
};
