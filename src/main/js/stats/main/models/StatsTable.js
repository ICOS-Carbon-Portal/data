export default class StatsTable {

	constructor(stats, filters = {}, page = 1, stationCountryCodes) {
		this._stats = stats;
		this._filters = filters;
		this._page = page;
		this._stationCountryCodes = stationCountryCodes;
	}

	get stats() {
		return this._stats;
	}

	get filters() {
		return this._filters;
	}

	update(stats, filters, page) {
		return new StatsTable(stats, filters, page, this._stationCountryCodes);
	}

	withFilter(filterName, filterValue) {
		const newFilters = Object.assign({}, this._filters, { [filterName]: filterValue });
		return new StatsTable(this._stats, newFilters, this._page, this._stationCountryCodes);
	}

	withStationCountryCodes(stationCountryCodes) {
		return new StatsTable(this._stats, this._filters, this._page, stationCountryCodes);
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
