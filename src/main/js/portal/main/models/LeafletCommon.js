export function	getBaseMaps(maxZoom){
	var topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	var image = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	var osm = L.tileLayer(window.location.protocol + "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom
	});

	var mapQuest = L.tileLayer("http://otile{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png", {
		maxZoom,
		subdomains: "1234"
	});

	return {
		"Topographic": topo,
		"Satellite": image,
		"OSM": osm,
		"MapQuest": mapQuest
	};
}

export const wdcggIcon = L.icon({
	iconUrl: 'https://static.icos-cp.eu/images/tmp/wdcgg.svg',
	iconSize:     [23, 28],
	iconAnchor:   [12, 28],
	popupAnchor:  [0, -23]
});

export function pointIcon(radius) {
	return {
		radius,
		weight: 3,
		color: 'white',
		fillColor: 'rgb(255,50,50)',
		fillOpacity: 1
	}
};

export function pointIconExcluded(radius) {
	return {
		radius,
		weight: 1,
		color: 'white',
		fillColor: 'rgb(255,200,200)',
		fillOpacity: 1
	}
};