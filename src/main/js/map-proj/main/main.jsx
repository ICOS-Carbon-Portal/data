import OL, {getViewParams} from './OL';
import {getCountriesGeoJson, queryMeta} from './backend';
import config from './config';
import {getStations} from './sparqlQueries';
import Stations from './models/Stations';
import Style from 'ol/style/style';
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Circle from 'ol/style/circle';
import Tile from 'ol/layer/tile';
import OSM from 'ol/source/osm';
import XYZ from 'ol/source/xyz';
import TileJSON from 'ol/source/tilejson';
import proj from 'ol/proj';
import Projection from 'ol/proj/projection';
import proj4 from 'proj4';
import Zoom from 'ol/control/zoom';
import ZoomSlider from 'ol/control/zoomslider';
import ScaleLine from 'ol/control/scaleline';
// import MousePosition from 'ol/control/mouseposition';
import ZoomToExtent from 'ol/control/zoomtoextent';
import LayerControl from './ol-controls/LayerControl';


const epsgCode = 'EPSG:3035';

if (epsgCode === 'EPSG:3035') {
	proj.setProj4(proj4);
	proj4.defs("EPSG:3035", "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

	proj.addProjection(new Projection({
		code: epsgCode,
		extent: getViewParams(epsgCode).extent,
		worldExtent: getViewParams(epsgCode).extent
	}));
}
const projection = proj.get(epsgCode);

const layers = [
	new Tile({
		visible: false,
		name: 'OpenStreetMap',
		layerType: 'baseMap',
		source: new OSM()
	}),
	new Tile({
		visible: false,
		name: 'Imagery',
		layerType: 'baseMap',
		source: new XYZ({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
		})
	}),
	new Tile({
		visible: false,
		name: 'Topology',
		layerType: 'baseMap',
		source: new XYZ({
			url: '//server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
		})
	}),
	new Tile({
		visible: false,
		name: 'Natural Earth',
		layerType: 'baseMap',
		source: new TileJSON({
			url: 'https://api.tiles.mapbox.com/v3/mapbox.natural-earth-hypso-bathy.json?secure',
			crossOrigin: 'anonymous'
		})
	})
];

const controls = [
	new Zoom(),
	new ZoomSlider(),
	new ScaleLine(),
	// new MousePosition({
	// 	undefinedHTML: 'Mouse position',
	// 	projection: epsgCode,
	// 	coordinateFormat: coord => `X: ${coord[0].toFixed(0)}, Y: ${coord[1].toFixed(0)}`
	// }),
	new ZoomToExtent({extent: getViewParams(epsgCode).extent}),
	new LayerControl(document.getElementById('layerCtrl'))
];

const map = new OL(projection, layers, controls);

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

		map.addGeoJson('Countries', 'baseMap', countriesTopo, countryBorderStyle, false);

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

				map.addPoints('Ocean stations', 'toggle', stationPointsOS, ptStyle('blue'));
				map.addPoints('Ecosystem stations', 'toggle', stationPointsES, ptStyle('green'));
				map.addPoints('Atmosphere stations', 'toggle', stationPointsAS, ptStyle('white'));
				map.addPoints('Ecosystem-Atmosphere', 'toggle', duplicates, ptStyle('green', 'white', 2, 5));

				shippingLines.forEach(sl => map.addGeoJson('Shipping lines', 'toggle', addProps(sl), lnStyle));
			});

		if (epsgCode === 'EPSG:3035') {
			map.add3035BBox();
		}
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
