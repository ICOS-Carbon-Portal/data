import L from 'leaflet';


export default class LeafletMap {
	constructor(mapElement){
		this._map = L.map(mapElement.props.id).setView([10, 0], 1);
		L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
			maxZoom: 18,
			id: 'mapbox.streets'
		}).addTo(this._map);
	}
}