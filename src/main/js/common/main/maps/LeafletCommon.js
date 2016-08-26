export function	getBaseMaps(maxZoom){
	const topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	const image = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	const osm = L.tileLayer(window.location.protocol + "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom
	});

	return {
		"Topographic": topo,
		"Satellite": image,
		"OSM": osm
	};
}

export const wdcggIcon = L.icon({
	iconUrl: 'https://static.icos-cp.eu/images/tmp/wdcgg.svg',
	iconSize:     [23, 28],
	iconAnchor:   [12, 28],
	popupAnchor:  [0, -23]
});

export function pointIcon() {
	return {
		radius: 4,
		weight: 3,
		color: 'white',
		fillColor: 'rgb(255,50,50)',
		fillOpacity: 1
	}
};

export function pointIconExcluded() {
	return {
		radius: 3,
		weight: 1,
		color: 'white',
		fillColor: 'rgb(255,200,200)',
		fillOpacity: 1
	}
};

export function pointIconExcluded2() {
	return {
		radius: 3,
		weight: 1,
		color: 'white',
		fillColor: 'rgb(50,50,50)',
		fillOpacity: 1
	}
};