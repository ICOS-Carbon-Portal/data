
export default class LeafletMap3D{
	constructor(mapOptions = {}) {
		this._mapOptions = mapOptions;
		this._map = undefined;
		this._ctrlLayers = undefined;

		this.initMap();
	}

	initMap(){
		const map = this._map = L.Wrld.map(
			'map',
			'69b29946cbdd922bd28d6519a1fe4c05',
			Object.assign({
				center: [52, 10],
				zoom: 0,
				indoorsEnabled: false,
				displayEntranceMarkers: false
			}, this._mapOptions)
		);

		map.themes.setTheme(
			L.Wrld.themes.season.Winter,
			L.Wrld.themes.time.Day,
			L.Wrld.themes.weather.Snowy
		);
	}
}