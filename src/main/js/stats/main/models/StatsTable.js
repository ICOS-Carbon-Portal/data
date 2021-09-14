import FilterTemporal from "./FilterTemporal";

export default class StatsTable {

	constructor(stats, filters = {}, page = 1, stationCountryCodes, temporalFilters) {
		this._stats = stats;
		this._filters = filters;
		this._page = page;
		this._stationCountryCodes = stationCountryCodes;
		this._temporalFilters = temporalFilters ?? new FilterTemporal();
	}

	get stats() {
		return this._stats;
	}

	get filters() {
		return this._filters;
	}

	get temporalFilters(){
		return this._temporalFilters;
	}

	update(stats, filters, page) {
		return new StatsTable(stats, filters, page, this._stationCountryCodes, this._temporalFilters);
	}

	withFilter(filterName, filterValue) {
		const newFilters = Object.assign({}, this._filters, { [filterName]: filterValue });
		return new StatsTable(this._stats, newFilters, this._page, this._stationCountryCodes, this._temporalFilters);
	}

	withStationCountryCodes(stationCountryCodes) {
		return new StatsTable(this._stats, this._filters, this._page, stationCountryCodes, this._temporalFilters);
	}

	withTemporalFilters(temporalFilters){
		return new StatsTable(this._stats, this._filters, this._page, this._stationCountryCodes, temporalFilters);
	}

	withoutFilter() {
		return new StatsTable(this._stats, {}, this._page, this._stationCountryCodes);
	}

	getFilter(name) {
		return this._filters[name] || [];
	}

	getSearchParamFilters() {
		return {
			...this._filters,
			dlStart: this._temporalFilters.fromTo.fromDateStr,
			dlEnd: this._temporalFilters.fromTo.toDateStr,
			...{ originStations: getDataOriginStations(this._filters.dataOriginCountries, this._stationCountryCodes) }
		};
	}
}

// Convert data origin countries to a list of stations
const getDataOriginStations = (dataOriginCountries, stationCountryCodes) => {
	if (dataOriginCountries === undefined) return;

	return Object.keys(stationCountryCodes).reduce((acc, stationUri) => {
		if (dataOriginCountries.includes(stationCountryCodes[stationUri])) {
			acc.push(stationUri);
		}
		return acc;
	}, []);
};
