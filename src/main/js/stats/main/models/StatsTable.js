import FilterTemporal from "./FilterTemporal";

export default class StatsTable {

	constructor(stats, filters = {}, page = 1, stationCountryCodes, temporalFilters, grayDownloadFilter) {
		this._stats = stats;
		this._filters = filters;
		this._page = page;
		this._stationCountryCodes = stationCountryCodes;
		this._temporalFilters = temporalFilters ?? new FilterTemporal();
		this._grayDownloadFilter = grayDownloadFilter;
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

	get grayDownloadFilter() {
		return this._grayDownloadFilter;
	}

	update(stats, filters, page) {
		return new StatsTable(stats, filters, page, this._stationCountryCodes, this._temporalFilters, this._grayDownloadFilter);
	}

	withFilter(filterName, filterValue) {
		const newFilters = Object.assign({}, this._filters, { [filterName]: filterValue });
		return new StatsTable(this._stats, newFilters, this._page, this._stationCountryCodes, this._temporalFilters, this._grayDownloadFilter);
	}

	withStationCountryCodes(stationCountryCodes) {
		return new StatsTable(this._stats, this._filters, this._page, stationCountryCodes, this._temporalFilters, this._grayDownloadFilter);
	}

	withTemporalFilters(temporalFilters){
		return new StatsTable(this._stats, this._filters, this._page, this._stationCountryCodes, temporalFilters, this._grayDownloadFilter);
	}

	withGrayDownloadFilter(grayDownloadFilter) {
		return new StatsTable(this._stats, this._filters, this._page, this._stationCountryCodes, this._temporalFilters, grayDownloadFilter)
	}

	withoutFilter() {
		document.getElementById("from").value = ""
		document.getElementById("to").value = ""
		return new StatsTable(this._stats, {}, this._page, this._stationCountryCodes);
	}

	getFilter(name) {
		return this._filters[name] || [];
	}

	getSearchParamFilters() {
		return {
			...this._filters,
			grayDownloadFilter: this._grayDownloadFilter,
			dlStart: this._temporalFilters.fromTo.fromDateTimeStr,
			dlEnd: this._temporalFilters.fromTo.toDateTimeStr,
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
