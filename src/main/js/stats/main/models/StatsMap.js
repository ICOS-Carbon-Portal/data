import {undef} from "browserify-css/config/jshint";

export default class StatsMap {
	constructor(countryStats, countriesTopo, isReadyForMapUpdate){
		this._countryStats = countryStats;
		this._countriesTopo = countriesTopo;
		this._isReadyForMapUpdate = isReadyForMapUpdate;
	}

	withCountryStats(countryStats){
		return new StatsMap(countryStats, this._countriesTopo, this._countriesTopo !== undefined);
	}

	withCountriesTopo(countriesTopo){
		return new StatsMap(this._countryStats, countriesTopo, this._countryStats !== undefined);
	}

	get countryStats(){
		this._isReadyForMapUpdate = false;
		return this._countryStats;
	}

	get countriesTopo(){
		return this._countriesTopo;
	}

	get isReadyForMapUpdate(){
		return this._isReadyForMapUpdate;
	}

	getCount(isoCode) {
		const stats = this._countryStats.find(stat => stat.countryCode === isoCode);
		return stats === undefined
			? 'unknown'
			: stats.count;
	}

	get minCount(){
		return this._countryStats.length
			? this._countryStats[this._countryStats.length - 1].count
			: 0;
	}

	get maxCount(){
		return this._countryStats.length
			? this._countryStats[0].count
			: 0;
	}
}
