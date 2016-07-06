
function groupByUri(stationInfos){
	return stationInfos.reduce(
		(acc, next) => Object.assign(acc, {[next.uri]: next}),
		{}
	);
}

function unwrapToArray(groupedStations){
	return Object.getOwnPropertyNames(groupedStations).map(stationUri => groupedStations[stationUri]);
}

function isMobile(stationInfo){
	return isNaN(stationInfo.lat) || isNaN(stationInfo.lon);
}

export default class StationsInfo{

	constructor(stations, stationary, mobile, selected){
		if(arguments.length < 4){
			this._all = groupByUri(stations);
			this._stationary = stations.filter(st => !isMobile(st));
			this._mobile = stations.filter(isMobile);
			this._selected = this._stationary;
		}else{
			this._all = stations;
			this._stationary = stationary;
			this._mobile = mobile;
			this._selected = selected;
		}
	}

	getStation(uri){
		return this._all[uri];
	}

	get allStations(){
		return unwrapToArray(this._all);
	}

	get mobileStations(){
		return this._mobile;
	}

	get stationaryStations(){
		return this._stationary;
	}

	get selectedStations(){
		return this._selected;
	}

	get nonSelectedStationary(){
		const lookup = groupByUri(this._selected);
		return this._stationary.filter(s => !lookup.hasOwnProperty(s.uri));
	}

	withSelected(selectedUris){
		const selected = selectedUris.map(uri => this._all[uri]).filter(s => !!s && !isMobile(s));
		return new StationsInfo(this._all, this._stationary, this._mobile, selected);
	}
}
