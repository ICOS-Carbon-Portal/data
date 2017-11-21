import L from 'leaflet';


export default class WebGLEarth{
	constructor(mapOptions = {}) {
		this._mapOptions = mapOptions;
		this._map = undefined;
		this._ctrlLayers = undefined;

		this.initMap();
	}

	initMap(){
		const map = this._map = new WE.map(document.getElementById('map'),
			Object.assign({
				preferCanvas: true,
				worldCopyJump: false,
				continuousWorld: true,
				center: [0, 0],
				zoom: 0,
				attributionControl: false
			}, this._mapOptions)
		);

		const NASA = WE.tileLayer('http://tileserver.maptiler.com/nasa/{z}/{x}/{y}.jpg', {
			minZoom: 0,
			maxZoom: 5,
			attribution: 'NASA'
		});

		const Topo = WE.tileLayer('//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
			minZoom: 0,
			maxZoom: 23
		});

		// NASA.addTo(map);
	}

	addCountries(geoJson, style){
		console.log({geoJson, style});
		const coords = geoJson.features.reduce((acc, curr) => {
			acc = acc.concat.apply([], curr.geometry.coordinates);
			return acc;
		}, []);

		console.log({coords});
		WE.polygon(coords, style).addTo(this._map);
	}
}