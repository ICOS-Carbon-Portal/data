export default class StatsTable {

  constructor(stats, filters = {}, page = 1) {
    this._stats = stats;
    this._filters = filters;
    this._page = page;
  }

  get stats() {
    return this._stats;
  }

  get filters() {
    return this._filters;
  }

  withFilter(filterName, filterValue) {
    const newFilters = Object.assign({}, this._filters, {[filterName]: filterValue});
    return new StatsTable(this._stats, newFilters);
  }

  withoutFilter() {
    return new StatsTable(this._stats);
  }

  getFilter(name) {
    return this._filters[name] || [];
  }

}
