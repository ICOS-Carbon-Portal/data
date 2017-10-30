export default class StatsTable {

  constructor(stats, filters = {}) {
    this._stats = stats;
    this._filters = filters;
  }

  get stats() {
    return this._stats;
  }

  get filters() {
    return this._filters;
  }

  withFilter(filterName, filterValue) {
    if (filterValue && filterValue.length == 0) return this;
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
