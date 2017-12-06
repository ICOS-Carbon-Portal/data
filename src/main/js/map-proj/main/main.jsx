// import LeafletMap from './LeafletMap';
// import LeafletMap3D from './LeafletMap3D';
import OL from './OL';
import {getCountriesGeoJson, queryMeta} from './backend';
import config from './config';
import {getStations} from './sparqlQueries';
import Stations from './models/Stations';
// import {getBaseMaps} from 'icos-cp-leaflet-common';
import Style from 'ol/style/style';
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Circle from 'ol/style/circle';
import Tile from 'ol/layer/tile';
import OSM from 'ol/source/osm';
import XYZ from 'ol/source/xyz';
import TileJSON from 'ol/source/tilejson';
import proj from 'ol/proj';
import proj4 from 'proj4';


proj.setProj4(proj4);
proj4.defs("EPSG:3035", "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
const projection = proj.get('EPSG:3035');

const layers = [
	// new Tile({source: new OSM()}),
	// new Tile({source: new XYZ({
	// 	url: '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	// })}),
	// new Tile({source: new XYZ({
	// 	url: '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
	// })}),
	// new Tile({
	// 	source: new TileJSON({
	// 		url: 'https://api.tiles.mapbox.com/v3/mapbox.natural-earth-hypso-bathy.json?secure',
	// 		crossOrigin: 'anonymous'
	// 	})
	// })
];

const map = new OL(projection, layers, document.getElementById('popover'));

getCountriesGeoJson()
	.then(countriesTopo => {
		const countryBorderStyle = new Style({
			fill: new Fill({
				color: 'rgb(205,170,102)'
			}),
			stroke: new Stroke({
				color: 'rgb(100,100,100)',
				width: 1
			})
		});

		map.addGeoJson(countriesTopo, countryBorderStyle, false);

		queryMeta(getStations(config))
			.then(sparqlResult => {
				const ptStyle = (fillColor, strokeColor = 'black', strokeWidth = 1, radius = 4) => new Style({
					image: new Circle({
						radius,
						snapToPixel: true,
						fill: new Fill({color: fillColor}),
						stroke: new Stroke({color: strokeColor, width: strokeWidth})
					})
				});
				const lnStyle = new Style({
					stroke: new Stroke({
						color: 'rgb(50,50,200)',
						width: 2
					})
				});

				const transformPointFn = projection.getCode() === 'EPSG:4326'
					? (lon, lat) => [lon, lat]
					: (lon, lat) => proj.transform([lon, lat], 'EPSG:4326', projection);

				const stations = new Stations(sparqlResult, transformPointFn);
				const duplicates = stations.getDuplicates({type: 'point'});

				const stationPointsOS = stations
					.filterByAttr({type: 'point', themeShort: 'OS'})
					.filter(s => !duplicates.some(d => d.id === s.id));
				const stationPointsES = stations
					.filterByAttr({type: 'point', themeShort: 'ES'})
					.filter(s => !duplicates.some(d => d.id === s.id));
				const stationPointsAS = stations
					.filterByAttr({type: 'point', themeShort: 'AS'})
					.filter(s => !duplicates.some(d => d.id === s.id));
				const shippingLines = stations.filterByAttr({type: 'line'});

				console.log({duplicates, stationPointsOS, stationPointsES, stationPointsAS, shippingLines});

				map.addPoints(stationPointsOS, ptStyle('blue'));
				map.addPoints(stationPointsES, ptStyle('green'));
				map.addPoints(stationPointsAS, ptStyle('white'));
				map.addPoints(duplicates, ptStyle('green', 'white', 2, 5));

				shippingLines.forEach(sl => map.addGeoJson(addProps(sl), lnStyle));
			});
	});

const addProps = feature => {
	const props = Object.keys(feature).reduce((acc, key) => {
		if (key !== 'geoJson' && feature[key]){
			acc[key] = feature[key];
		}
		return acc;
	}, {});

	return {
		type: "Feature",
		geometry: feature.geoJson,
		properties: props
	};
};

//
// const run3D = () => {
// 	const mapOptions = {center: [50, 10], zoom: 4};
// 	const map = new LeafletMap3D(mapOptions);
//
// 	// getCountriesGeoJson()
// 	// 	.then(countriesTopo => {
// 	// 		const style = {
// 	// 			fillOpacity: 0.6,
// 	// 			fillColor: '#111',
// 	// 			color: '#999',
// 	// 			weight: 1,
// 	// 			opacity: 1
// 	// 		};
// 	//
// 	// 		WE.addCountries(countriesTopo, style)
// 	// 	});
// };
//
// const run2D = () => {
// 	const srid = 3035;
// 	const mapOptions = {};
// 	const lm = new LeafletMap(srid, mapOptions);
//
// 	getCountriesGeoJson()
// 		.then(countriesTopo => {
// 			const baseMaps = getBaseMaps(21);
// 			const style = {
// 				fillOpacity: 0.6,
// 				fillColor: 'rgb(205,170,102)',
// 				color: "rgb(100,100,100)",
// 				weight: 1,
// 				opacity: 1
// 			};
// 			const simple = {Simple: lm.getGeoJsonLayer(countriesTopo, style)};
// 			lm.addControlLayers('Simple', Object.assign(baseMaps, simple), undefined, {sortLayers: true});
//
// 			queryMeta(getStations(config))
// 				.then(sparqlResult => {
// 					const stations = new Stations(sparqlResult);
//
// 					const stationPointsOS = stations.filter({type: 'point', themeShort: 'OS'});
// 					const stationPointsES = stations.filter({type: 'point', themeShort: 'ES'});
// 					const stationPointsAS = stations.filter({type: 'point', themeShort: 'AS'});
//
// 					const styleOS = getPointStyle('OS');
// 					const styleES = getPointStyle('ES');
// 					const styleAS = getPointStyle('AS');
//
// 					console.log({stationPointsOS, stationPointsES, stationPointsAS});
//
// 					const stationLayerOS = lm.getPointsLayer(stationPointsOS, styleOS, popupContent);
// 					const stationLayerES = lm.getPointsLayer(stationPointsES, styleES, popupContent);
// 					const stationLayerAS = lm.getPointsLayer(stationPointsAS, styleAS, popupContent);
//
// 					lm.addOverlay(stationLayerOS, "Ocean stations", true);
// 					lm.addOverlay(stationLayerES, "Ecosystem stations", true);
// 					lm.addOverlay(stationLayerAS, "Atmospheric stations", true);
//
// 					// lm.addPointsLayer("Stations", stations.getList('point'), options, popupContent);
// 					// lm.addPoints(stations.getList('point'), options, popupContent);
//
// 					const stationLines = lm.getLines(stations.filter({type: 'line'}), {}, popupContent);
// 					lm.addOverlay(stationLines, "Shipping lines", true);
// 					// lm.addLines(stations.filter({type: 'line'}), {}, popupContent);
//
// 					if (lm.srid === 3035) {
// 						lm.add3035Mask();
// 					}
// 				});
//
// 		});
// };
//
// const popupContent = feature => {
// 	return Object.keys(feature)
// 		.filter(key => key === 'Country' || key === 'Site_type' || key === 'Short_name' || key === 'Long_name' || key === 'PI_names')
// 		.reduce((acc, key) => {
// 			return acc + `<div><b>${key.replace('_', ' ')}:</b> ${feature[key] || 'Not defined'}</div>`;
// 		}, '');
// };
//
// const getPointStyle = themeShort => {
// 	const style = {radius: 3, fillOpacity: 1, weight: 6, opacity: 0};
//
// 	switch(themeShort){
// 		case 'OS': return Object.assign(style, {fillColor: 'blue'});
// 		case 'ES': return Object.assign(style, {fillColor: 'green'});
// 		case 'AS': return Object.assign(style, {fillColor: 'white'});
// 	}
// };
//
// const options = point => {
// 	const style = {radius: 3, fillOpacity: 1, weight: 6, opacity: 0};
//
// 	switch(point.themeShort){
// 		case 'OS': return Object.assign(style, {fillColor: 'blue'});
// 		case 'ES': return Object.assign(style, {fillColor: 'green'});
// 		case 'AS': return Object.assign(style, {fillColor: 'white'});
// 	}
// };
//
