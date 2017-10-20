export default class StatsTable {

  constructor(stats, filters = {}) {
    this._stats = stats;
    this._filters = filters;
  }

  get stats() {
    // return this._stat.filter(stat => stat.specification[this._filter.name] == this._filter.value);
    return this._stats;
  }

  get filters() {
    return this._filters;
  }

  withFilter(filterName, filterValue) {
    if (filterValue && filterValue.length == 0) return this;
    const filteredStat = this._stats.filter(stat => stat.specification[filterName] == filterValue);
    const newFilters = Object.assign({}, this._filters, {[filterName]: filterValue});
    // return new Stat(filteredStat, {name: filterName, value: filterValue});
    return new StatsTable(filteredStat, newFilters);
  }

  withoutFilter() {
    return new StatsTable(this._stats);
  }

  getFilter(name) {
    return this._filters[name] || [];
  }

}
