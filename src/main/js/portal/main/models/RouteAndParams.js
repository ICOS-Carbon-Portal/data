import config from '../config';


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
		const keepFilters = Object.assign({}, this._filters.filterTemporal);
		console.log({filters: this._filters, keepFilters});
		return new RouteAndParams(this._route);
	}

	get route(){
		return this._route;
	}

	get filters(){
		return this._filters;
	}

	get urlPart(){
		const filterKeys = Object.keys(this._filters);
		return filterKeys.length
			? this._route + '?' + filterKeys.map(key => key + '=' + encodeURIComponent(JSON.stringify(this._filters[key]))).join('&')
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
