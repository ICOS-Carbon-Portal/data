export function	getBaseMaps(maxZoom){
	// All sources deliver in SRS 3857 (Web Mercator)
	const topo = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	const image = L.tileLayer(window.location.protocol + '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom
	});

	const osm = L.tileLayer(window.location.protocol + '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom
	});

	return {
		"Topographic": topo,
		"Satellite": image,
		"OSM": osm
	};
}

export function	getMapProxyBaseMapsWMS(maxZoom){
	// All sources deliver in SRS 4326 (Lat Long)
	const topo = L.tileLayer.wms(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/service', {
		layers: 'topo',
		format: 'image/jpeg',
		transparent: false,
		maxZoom
	});

	const image = L.tileLayer.wms(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/service', {
		layers: 'satellite',
		format: 'image/png',
		transparent: false,
		maxZoom
	});

	const osm = L.tileLayer.wms(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/service', {
		layers: 'osm',
		format: 'image/jpeg',
		transparent: false,
		maxZoom
	});

	return {
		"Topographic": topo,
		"Satellite": image,
		"OSM": osm
	};
}

export function	getMapProxyBaseMapsTMS(maxZoom){
	// All sources deliver in SRS 4326 (Lat Long)
	const topo = L.tileLayer(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/tms/1.0.0/topo/GLOBAL_GEODETIC/{z}/{x}/{y}.jpeg', {
		maxZoom,
		tms: true
	});

	const image = L.tileLayer(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/tms/1.0.0/satellite/GLOBAL_GEODETIC/{z}/{x}/{y}.png', {
		maxZoom,
		tms: true
	});

	const osm = L.tileLayer(window.location.protocol + '//mapproxy.gis.lu.se/mapproxy/tms/1.0.0/osm/GLOBAL_GEODETIC/{z}/{x}/{y}.png', {
		maxZoom,
		tms: true
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

export function pointIcon(radius = 4, weight = 3, fillColor = 'rgb(255,50,50)', border = 'white') {
	return {
		radius,
		weight,
		color: border,
		fillColor,
		fillOpacity: 1
	}
};

export function pointIconExcluded(radius = 4, weight = 2) {
	return {
		radius,
		weight,
		color: 'white',
		fillColor: 'rgb(255,200,200)',
		fillOpacity: 1
	}
};

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

export const CoordValueViewer = L.Control.extend({
	options: {
		position: 'bottomleft',
		decimals: 3,
		style: "background-color: white; padding-left: 3px; padding-right: 3px;"
	},

	initialize: function (raster, helper, options) {
		L.Util.setOptions(this, options);
		this._raster = raster;
		this._mapper = helper;
	},

	onAdd: function (map) {
		//disable double click zoom because it interferes with single click
		map.doubleClickZoom.disable();

		var freeze = false;
		const container = L.DomUtil.create('div', '', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);
		L.DomEvent.on(container, 'mousemove', L.DomEvent.stopPropagation);

		const infoDiv = L.DomUtil.create('div', '', container);
		const valDiv = L.DomUtil.create('div', '', container);
		const latDiv = L.DomUtil.create('div', '', container);
		const lonDiv = L.DomUtil.create('div', '', container);

		function display(self, latlng, infoTxt){
			const xy = self._mapper.lookupPixel(latlng.lng, latlng.lat);

			infoDiv.innerHTML = infoTxt ? infoTxt : '';

			if (xy) {
				const val = self._raster.getValue(Math.round(self._raster.height - xy.y - 0.5), Math.round(xy.x - 0.5));

				valDiv.innerHTML = isNaN(val)
					? ''
					: '<b>Value:</b> ' + parseFloat(val.toPrecision(9));
				latDiv.innerHTML = '<b>Lat:</b> ' + latlng.lat.toFixed(self.options.decimals);
				lonDiv.innerHTML = '<b>Lng:</b> ' + latlng.lng.toFixed(self.options.decimals);
			} else {
				clear();
			}
		}

		function clear(){
			valDiv.innerHTML = "";
			latDiv.innerHTML = "";
			lonDiv.innerHTML = "";
		}

		map.on('mousemove', e => {
			if(!freeze) {
				display(this, e.latlng);
			}
		});

		map.on('click', e => {
			freeze = !freeze;
			const infoTxt = freeze ? '<b>Click in map to unfreeze</b>' : null;
			display(this, e.latlng, infoTxt);
		});

		map.on('mouseout', () => {
			if (!freeze) {
				clear();
			}
		});

		return container;
	},

	onRemove: function (map) {
		map.off('mousemove');
		map.off('mouseout');
		map.off('click');
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
