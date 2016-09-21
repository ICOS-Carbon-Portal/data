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

export const wdcggIconHighlight = L.icon({
	iconUrl: 'https://static.icos-cp.eu/images/tmp/wdcgg_highlight.svg',
	iconSize:     [23, 28],
	iconAnchor:   [12, 28],
	popupAnchor:  [0, -23]
});

export function pointIcon(radius = 4, weight = 3, fillColor = 'rgb(255,50,50)') {
	return {
		radius,
		weight,
		color: 'white',
		fillColor,
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

export function addTopoGeoJson(map, topoGeoJson, style){
	if (!L.TopoJSON) {
		L.TopoJSON = L.GeoJSON.extend({
			addData: function (jsonData) {
				const self = this;

				if (jsonData.type === "Topology") {
					Object.keys(jsonData.objects).forEach(key => {
						const geoJson = topojson.feature(jsonData, jsonData.objects[key]);
						L.GeoJSON.prototype.addData.call(self, geoJson);
					});
				}
				else {
					L.GeoJSON.prototype.addData.call(self, jsonData);
				}
			}
		});
	}

	const countryStyle = style
		? style
		: {fillOpacity: 0, color: "rgb(0,0,0)", weight: 1, opacity: 1};

	const countries = new L.TopoJSON();
	countries.addData(topoGeoJson);
	countries.setStyle(countryStyle);
	countries.addTo(map);
}

export function popupHeader(txt){
	const div = document.createElement('div');

	const b = document.createElement('b');
	b.innerHTML = txt;
	div.appendChild(b);
	div.appendChild(document.createElement('br'));

	return div;
}

export function setView(map, geoms){
	function getUniqueGeoms(g){
		let uniqueGeoms = [];

		g.forEach(geom => {
			if (uniqueGeoms.findIndex(ug => ug.lat == geom.lat && ug.lon == geom.lon) < 0) {
				uniqueGeoms.push(geom);
			}
		});

		return uniqueGeoms;
	}

	const uniqueGeoms = getUniqueGeoms(geoms);

	if (uniqueGeoms.length == 0){
		map.setView([0, 0], 1);
	} else if (uniqueGeoms.length == 1){
		map.setView([uniqueGeoms[0].lat, uniqueGeoms[0].lon], 6);
	} else {
		map.fitBounds(uniqueGeoms.map(geom => [geom.lat, geom.lon]));
	}
}

export const CoordViewer = L.Control.extend({
	options: {
		position: 'bottomleft',
		decimals: 3,
		style: "background-color: white; padding-left: 3px; padding-right: 3px;"
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div', 'coords-container', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);
		container.innerHTML = "";
		L.DomEvent.on(container, 'mousemove', L.DomEvent.stopPropagation);

		map.on('mousemove', e => {
			container.innerHTML =
				"Lat: " + e.latlng.lat.toFixed(this.options.decimals) +
				", Lng: " + e.latlng.lng.toFixed(this.options.decimals);
		}, this);

		map.on('mouseout', () => {
			container.innerHTML = "";
		}, this);

		return container;
	},

	onRemove: function (map) {
		map.off('mousemove');
		map.off('mouseout');
	},
});

L.PolygonMask = L.Polygon.extend({
	options: {
		weight: 1.5,
		color: 'red',
		fillColor: '#333',
		fillOpacity: 0.5,
		clickable: false,
		outerBounds: new L.LatLngBounds([-90, -360], [90, 360])
	},

	initialize: function (boundingBox, options) {
		this.boundingBox = boundingBox;
		const outerBoundsLatLngs = [
			this.options.outerBounds.getSouthWest(),
			this.options.outerBounds.getNorthWest(),
			this.options.outerBounds.getNorthEast(),
			this.options.outerBounds.getSouthEast()
		];
		const hole = [
			new L.LatLng(boundingBox.latMin, boundingBox.lonMin),
			new L.LatLng(boundingBox.latMax, boundingBox.lonMin),
			new L.LatLng(boundingBox.latMax, boundingBox.lonMax),
			new L.LatLng(boundingBox.latMin, boundingBox.lonMax)
		];
		L.Polygon.prototype.initialize.call(this, [outerBoundsLatLngs, hole], options);
	},

	isIdentical(boundingBox){
		return boundingBox.latMin == this.boundingBox.latMin
			&& boundingBox.latMax == this.boundingBox.latMax
			&& boundingBox.lonMin == this.boundingBox.lonMin
			&& boundingBox.lonMax == this.boundingBox.lonMax;
	}
});

export function polygonMask(boundingBox, options) {
	return new L.PolygonMask(boundingBox, options);
};