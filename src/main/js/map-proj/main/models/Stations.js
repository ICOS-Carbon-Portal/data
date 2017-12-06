export default class Stations{
	constructor(sparqlResult, transformPointFn){
		this._stations = this.parse(sparqlResult, transformPointFn);
	}

	parse(sparqlResult, transformPointFn){
		return sparqlResult.results.bindings.reduce((stationsAcc, currStation) => {

			const st = Object.keys(currStation).reduce((acc, stationkey) => {
				acc[stationkey] = sparqlBindingToValue(currStation[stationkey]);
				return acc;
			}, {});

			if (isNumeric(st.lat) && isNumeric(st.lon)){
				st.type = 'point';
				if (transformPointFn) st.point = transformPointFn(st.lon, st.lat);
			} else if (st.geoJson){
				st.type = 'line';
				st.geoJson = JSON.parse(st.geoJson);
			}

			stationsAcc.push(st);
			return stationsAcc;

		}, []);
	}

	getDuplicates(filterObj){
		const dupes = new Set();
		const stations = this.filterByAttr(filterObj);

		stations.reduce((acc, station) => {
			if (acc.size === acc.add(station.lon + '' + station.lat).size){
				dupes.add(station);
				dupes.add(stations.find(s => s.lat === station.lat && s.lon === station.lon));
			}

			return acc;
		}, new Set());

		return Array.from(dupes);
	}

	filterByAttr(filterObj){
		return this._stations.filter(s =>
			Object.keys(filterObj).reduce((acc, key) => {
				acc *= s[key] === filterObj[key];
				return acc;
			}, true)
		);
	}
}

const sparqlBindingToValue = b =>{
	if(!b || (b && b.value === "?")) return undefined;
	switch(b.datatype){
		case "http://www.w3.org/2001/XMLSchema#integer": return parseInt(b.value);
		case "http://www.w3.org/2001/XMLSchema#float": return parseFloat(b.value);
		case "http://www.w3.org/2001/XMLSchema#double": return parseFloat(b.value);
		case "http://www.w3.org/2001/XMLSchema#dateTime": return new Date(b.value);
		default: return b.value;
	}
};

const isNumeric = n => {
	return !isNaN(parseFloat(n)) && isFinite(n);
};
