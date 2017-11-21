import L from 'leaflet';
import 'proj4leaflet';
import 'leaflet.markercluster';
import {CoordViewer} from 'icos-cp-leaflet-common';
import PointsOnGreatCircle from './models/PointsOnGreatCircle';
import proj4 from 'proj4';

export default class LeafletMap{
	constructor(srid, mapOptions = {}) {
		if (srid !== 3035 && srid !== 4326 && srid !== 3857) return {};

		this._mapOptions = mapOptions;
		this._srid = srid;
		this._csr = getCRS(srid);
		this._bounds = getBounds(srid);
		this._trueBoundsCoords = getTrueBoundsCoords(srid, this._bounds.coords);
		this._trueBoundsBbox = getProjectedBbox(srid, this._trueBoundsCoords);
		this._map = undefined;
		this._ctrlLayers = undefined;
		this._markerClusterGroup = L.markerClusterGroup({
			maxClusterRadius: zoom => 0.1,
			spiderfyDistanceMultiplier: 1.8
		});

		console.log(this._csr);

		if (srid === 3035) {
			proj4.defs("EPSG:3035", "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
		}

		this.initMap();
	}

	get srid(){
		return this._srid;
	}

	get map(){
		return this._map;
	}

	initMap(){
		const centre = this._srid === 3035
			? L.latLngBounds(L.latLng(this._bounds.maxBounds[0]), L.latLng(this._bounds.maxBounds[1])).getCenter()
			: L.latLng(30, 0);

		const map = this._map = L.map(document.getElementById('map'),
			Object.assign({
				preferCanvas: true,
				// layers: this._srid === 3857 ? [baseMaps.Topographic] : [],
				crs: this._csr,
				// worldCopyJump: false,
				// continuousWorld: true,
				center: centre,
				zoom: this._srid === 3035 ? 1 : 2,
				maxZoom: 13,
				// maxBounds: [this._trueBoundsBbox[0], this._trueBoundsBbox[2]],
				// maxBoundsViscosity: 0.5,
				attributionControl: false
			}, this._mapOptions)
		);

		// const orgUnproject = L.Proj.Projection.prototype.unproject.bind(L.Proj.Projection);
		// console.log(L.LatLng);

		// L.LatLng.prototype.include({
		// 	initialize: (lat, lng, alt) => {
		// 		if (isNaN(lat) || isNaN(lng)) {
		// 			throw new Error('Invalid LatLng: (' + lat + ', ' + lng + ')');
		// 		}
		// 		this.lat = +lat;
		// 		this.lng = +lng;
		// 		if (alt !== undefined) this.alt = +alt;
		// 	}
		// });

		// const LatLngOrg = L.LatLng;
		// LatLngOrg.prototype.equals = (obj, maxMargin) => {
		// 	if (!obj) { return false; }
		// 	obj = customToLatLng(obj);
		//
		// 	const margin = Math.max(
		// 		Math.abs(this.lat - obj.lat),
		// 		Math.abs(this.lng - obj.lng));
		//
		// 	return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
		// };
		// LatLngOrg.prototype.distanceTo = (other) => {
		// 	return L.Earth.distance(this, customToLatLng(other));
		// };
		// L.LatLng = customLatLng;
		// L.LatLng.prototype = LatLngOrg.prototype;

		// L.Proj.Projection.include({
		// 	unproject: (point, unbounded) => {
		// 		console.log({point, unbounded});
		// 		return orgUnproject(point, unbounded);
		// 	}
		// });
		// L.Proj.Projection = L.extend(L.Proj.Projection.prototype, {
		// 	unproject(point, unbounded){
		// 		console.log({point, unbounded});
		// 		return L.Proj.Projection.prototype.unproject.call(point, unbounded);
		// 	}
		// });

		// L.Proj.Projection.unproject = (point, unbounded) => {
		// 	console.log({point, unbounded});
		// 	return L.Proj.Projection.prototype.unproject.call(point, unbounded);
		// };

		map.fitBounds(this._bounds.maxBounds);
// 		const maxBounds = this._srid === 3035
// 			? L.bounds(toPoints(map, this._bounds.maxBounds))
// 			: this._bounds.maxBounds;
// console.log(maxBounds);
// 		map.setMaxBounds(maxBounds);
// 		map.addLayer(new L.Polygon(this._trueBoundsBbox));
// 		map.addLayer(new L.Polygon(this._trueBoundsCoords));
		// const self = this;
		// window.onerror = (err) => {
		// 	console.log({err});
		// 	self._map.fitBounds(self._bounds.maxBounds);
		// };

		this._ctrlLayers = L.control.layers().addTo(map);
		map.addLayer(this._markerClusterGroup);
		map.addControl(new CoordViewer({decimals: 4}));
	}

	getGeoJsonLayer(geoJson, style){
		const geoJsonLayer = L.Proj.geoJson(geoJson);
		return geoJsonLayer.setStyle(style);
	}

	addGeoJson(geoJson, style){
		this._map.addLayer(this.getGeoJsonLayer(geoJson, style));
	}

	addControlLayers(selectedBaseMapName, baseMaps, overlays, options){
		// this._ctrlLayers = L.control.layers(baseMaps, overlays, options).addTo(this._map);
		Object.keys(baseMaps).forEach(layerName => this.addBaseMap(baseMaps[layerName], layerName));
		this._map.addLayer(baseMaps[selectedBaseMapName]);
	}

	addBaseMap(layer, layerName){
		this._ctrlLayers.addBaseLayer(layer, layerName);
	}

	addOverlay(layer, layerName, selected){
		this._ctrlLayers.addOverlay(layer, layerName);
		if (selected) this._map.addLayer(layer);
	}

	getPointsLayer(pointList, style, popupContent){
		const layerGroup = L.layerGroup();

		pointList.forEach(point => {
			const circleMarker = L.circleMarker([point.lat, point.lon], style);

			if (popupContent) {
				circleMarker.bindPopup(popupContent(point), {closeButton: false})
					.on('mouseover', e => circleMarker.openPopup())
					.on('mouseout', e => circleMarker.closePopup());
			}

			layerGroup.addLayer(circleMarker);
		});

		return layerGroup;
	}

	// addPointsLayer(layerName, pointList, options, popupContent, selected = true){
	// 	const layerGroup = L.layerGroup();
	//
	// 	pointList.forEach(point => {
	// 		const circleMarker = L.circleMarker([point.lat, point.lon], options(point));
	//
	// 		if (popupContent) {
	// 			circleMarker.bindPopup(popupContent(point), {closeButton: false})
	// 				.on('mouseover', e => circleMarker.openPopup())
	// 				.on('mouseout', e => circleMarker.closePopup());
	// 		}
	//
	// 		layerGroup.addLayer(circleMarker);
	// 	});
	//
	// 	if (layerGroup.getLayers().length > 0) {
	// 		this.addOverlay(layerGroup, layerName, selected);
	// 	}
	// }

	// addPoints(pointList, options, popupContent){
	// 	pointList.forEach(point => {
	// 		const circleMarker = L.circleMarker([point.lat, point.lon], options(point));
	//
	// 		if (popupContent) {
	// 			circleMarker.bindPopup(popupContent(point), {closeButton: false})
	// 				.on('mouseover', e => circleMarker.openPopup())
	// 				.on('mouseout', e => circleMarker.closePopup());
	// 		}
	//
	// 		circleMarker.addTo(this._map);
	// 		// this._markerClusterGroup.addLayer(circleMarker);
	// 	});
	// }

	getLines(lineList, style, popupContent){
		const layerGroup = L.layerGroup();

		lineList.forEach(lineObj => {
			// const line = L.polyline(PointsOnGreatCircle.fromJson(lineObj.geoJson, 3));
			const line = this.getGeoJsonLayer(JSON.parse(lineObj.geoJson), style);

			if (popupContent) {
				line.bindPopup(popupContent(lineObj), {closeButton: false})
					.on('mouseover', e => line.openPopup(e.latlng))
					.on('mouseout', e => line.closePopup());
			}

			layerGroup.addLayer(line);
		});

		return layerGroup;
	}

	addLines(lineList, style, popupContent){
		lineList.forEach(lineObj => {
			// const line = L.polyline(PointsOnGreatCircle.fromJson(lineObj.geoJson, 3));
			const line = this.getGeoJsonLayer(JSON.parse(lineObj.geoJson), style);

			if (popupContent) {
				line.bindPopup(popupContent(lineObj), {closeButton: false})
					.on('mouseover', e => line.openPopup(e.latlng))
					.on('mouseout', e => line.closePopup());
			}

			line.addTo(this._map);
		});
	}

	add3035Mask(useBbox = false){
		const options = {
			weight: 1,
			color: 'gray',
			fillColor: '#aee1e6',
			fillOpacity: 1,
			clickable: false
		};
		const ob = [[-34, -71], [-5, -120], [70, 179], [1, 140], [-22, 82]];
		// const ob = [[-34, -71], [-48, -165], [-35, 174], [-22, 82]];
		const outerBounds = this._srid === 3035
			? ob
			: this._bounds.coords;
		const outerBoundsLatLngs = outerBounds.map(coords => new L.LatLng(coords[0], coords[1]));
		// console.log({bounds: this._bounds, trueBoundsCoords: this._trueBoundsCoords, options, outerBoundsLatLngs});
		// const maskHole = new L.Polygon([outerBoundsLatLngs, this._trueBoundsCoords], options);
		const maskHole = new L.Polygon([outerBoundsLatLngs, this._trueBoundsBbox], options);
		maskHole.addTo(this._map);
	}
}

const getTrueBoundsCoords = (srid, bounds) => {
	return srid === 3035
		? PointsOnGreatCircle.fromCoords(bounds, 5)
		: bounds;
};

const getProjectedBbox = (srid, bounds) => {
	if (srid === 3035){
		const trueBoundsPolygonCRS = bounds.map(coord => proj4('EPSG:4326', 'EPSG:3035', [coord[1], coord[0]]));
		const bboxCRS = trueBoundsPolygonCRS.reduce((acc, coord) => {
			acc[0] = acc[0] === undefined || coord[0] < acc[0] ? coord[0] : acc[0];
			acc[1] = acc[1] === undefined || coord[1] < acc[1] ? coord[1] : acc[1];
			acc[2] = acc[2] === undefined || coord[0] > acc[2] ? coord[0] : acc[2];
			acc[3] = acc[3] === undefined || coord[1] > acc[3] ? coord[1] : acc[3];
			return acc;
		}, [undefined, undefined, undefined, undefined]);
		const bboxCoordsCRS = [
			[bboxCRS[0], bboxCRS[1]],
			[bboxCRS[0], bboxCRS[3]],
			[bboxCRS[2], bboxCRS[3]],
			[bboxCRS[2], bboxCRS[1]],
		];
		const bboxCoords = bboxCoordsCRS.map(coord => proj4('EPSG:3035', 'EPSG:4326', coord));

		return bboxCoords.map(coord => [coord[1], coord[0]]);
	} else {
		return bounds;
	}
};

const getCRS = srid => {
	switch (srid){
		case 4326:
			return L.CRS.EPSG4326;

		case 3857:
			return L.CRS.EPSG3857;

		case 3035:
			return new L.Proj.CRS(
				'EPSG:3035',
				"+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
				{
					resolutions: [16384, 8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2],
					// transformation: new L.Transformation(1, 0, -1, 0)
				}
			);

		default:
			return L.CRS.EPSG3857;
	}
};

const getBounds = srid => {
	const bounds4326 = [[-90, -180], [90, 180]];
	const bounds3857 = [[-85.06, -180], [85.06, 180]];
	const bounds3035 = [[32.88, -16.1], [84.17 , 39.65]];

	const getBdry = bounds => {
		return {
			latMin: bounds[0][0],
			lonMin: bounds[0][1],
			latMax: bounds[1][0],
			lonMax: bounds[1][1]
		};
	};

	const getLatLonCoords = bounds => {
		return [
			[bounds[0][0], bounds[0][1]],
			[bounds[1][0], bounds[0][1]],
			[bounds[1][0], bounds[1][1]],
			[bounds[0][0], bounds[1][1]],
			[bounds[0][0], bounds[0][1]]
		];
	};

	let currentBounds;

	switch (srid){
		case 4326:
			currentBounds = bounds4326;
			break;

		case 3857:
			currentBounds = bounds3857;
			break;

		case 3035:
			currentBounds = bounds3035;
			break;

		default:
			currentBounds = bounds3857;
	}

	return {
		maxBounds: currentBounds,
		bounds: getBdry(currentBounds),
		coords: getLatLonCoords(currentBounds)
	};
};

const toPoints = (map, coords) => {
	return coords.map(c => map.latLngToLayerPoint(c));
};

class CustomLatLng{
	constructor(lat, lng, alt){
		if (isNaN(lat) || isNaN(lng)) {
			console.log({lat, lng, alt});
			this.lat = 0;
			this.lng = 0;
			// throw new Error('LatLng: (' + lat + ', ' + lng + ')');
		}

		this.lat = +lat;
		this.lng = +lng;

		if (alt !== undefined) {
			this.alt = +alt;
		}
	}
}

const customLatLng = (lat, lng, alt) => {
	return new CustomLatLng(lat, lng, alt);
};

const customToLatLng = (a, b, c) => {
	if (a instanceof CustomLatLng) {
		return a;
	}
	if (L.Util.isArray(a) && typeof a[0] !== 'object') {
		if (a.length === 3) {
			return new CustomLatLng(a[0], a[1], a[2]);
		}
		if (a.length === 2) {
			return new CustomLatLng(a[0], a[1]);
		}
		return null;
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new CustomLatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
	}
	if (b === undefined) {
		return null;
	}
	return new CustomLatLng(a, b, c);
};
