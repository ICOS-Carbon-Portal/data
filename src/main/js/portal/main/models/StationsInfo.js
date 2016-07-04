
function groupByUri(stationInfos){
	return stationInfos.reduce(
		(acc, next) => Object.assign(acc, {[next.uri]: next}),
		{}
	);
}

function unwrapToArray(groupedStations){
	Object.getOwnPropertyNames(groupedStations).map(stationUri => groupedStations[stationUri]);
}

export function isMobile(stationInfo){
	return isNaN(stationInfo.lat) || isNaN(stationInfo.lon);
}

export default class StationsInfo{

	constructor(stations, stationary, mobile, selected){
		if(arguments.length < 3){
			this._all = groupByUri(stations);
			this._stationary = groupByUri(stations.filter(st => !isMobile(st)));
			this._mobile = groupByUri(stations.filter(isMobile));
			this._selected = this._all;
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
		return unwrapToArray(this._mobile);
	}

	get stationaryStations(){
		return unwrapToArray(this._mobile);
	}

	get selectedStations(){
		return unwrapToArray(this._selected);
	}

	get stationaryCount(){
		return Object.getOwnPropertyNames(this._stationary).length;
	}

	get mobileCount(){
		return Object.getOwnPropertyNames(this._mobile).length;
	}

	get selectedCount(){
		return Object.getOwnPropertyNames(this._selected).length;
	}

	isSelected(stationUri){
		return this._selected.hasOwnProperty(stationUri);
	}

	withSelected(selectedUris){
		const selected = selectedUris.reduce(
			(acc, next) => Object.assign(acc, {[next]: this._all[next]}),
			{}
		);
		return new StationsInfo(this._all, this._stationary, this._mobile, selected);
	}
}
