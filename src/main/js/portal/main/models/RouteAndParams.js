import config from '../config';
import {varType} from '../utils';


export default class RouteAndParams{
	constructor(route, filters, tabs){
		this._route = route;
		this._filters = filters || {};
		this._tabs = tabs || {};
	}

	withRoute(route){
		return new RouteAndParams(route, this._filters, this._tabs);
	}

	withFilter(varName, values){
		return new RouteAndParams(this._route, Object.assign(this._filters, {[varName]: values}), this._tabs);
	}

	withTab(tab){
		return new RouteAndParams(this._route, this._filters, Object.assign(this._tabs, tab));
	}

	withResetFilters(){
		const filtersToKeep = {};
		if (this._filters.filterTemporal) filtersToKeep.filterTemporal = this._filters.filterTemporal;
		if (this._filters.filterFreeText) filtersToKeep.filterFreeText = this._filters.filterFreeText;

		return new RouteAndParams(this._route, filtersToKeep, this._tabs);
	}

	get route(){
		return this._route;
	}

	get filters(){
		return this._filters;
	}

	get tabs(){
		return this._tabs;
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

		const filtersAndTabs = Object.keys(this._tabs).length
			? Object.assign(newFilters, {tabs: this._tabs})
			: newFilters;

		const keys = Object.keys(filtersAndTabs);

		return keys.length
			? this._route + '?' + keys.map(key =>
				key + '=' + encodeURIComponent(JSON.stringify(filtersAndTabs[key]))).join('&')
			: this._route;
	}
}

export const restoreRouteAndParams = routeAndParams => {
	const urlParts = routeAndParams.split('?');
	const route = urlParts[0];
	const filtersAndTabs = urlParts[1]
		? urlParts[1].split('&').reduce((acc, keyVal) => {
			const param = keyVal.split('=');
			acc[param[0]] = JSON.parse(decodeURIComponent(param[1]));
			return acc;
		}, {})
		: {};

	const tabs = filtersAndTabs.tabs;
	const filters = filtersAndTabs;
	delete filters.tabs;

	return new RouteAndParams(route || config.DEFAULT_ROUTE, filters, tabs);
};
