import LeafletMap from './LeafletMap';
import LeafletMap3D from './LeafletMap3D';
import {getCountriesGeoJson, queryMeta} from './backend';
import config from './config';
import {getStations} from './sparqlQueries';
import Stations from './Stations';
import {getBaseMaps} from 'icos-cp-leaflet-common';


const run3D = () => {
	const mapOptions = {center: [50, 10], zoom: 4};
	const map = new LeafletMap3D(mapOptions);

	// getCountriesGeoJson()
	// 	.then(countriesTopo => {
	// 		const style = {
	// 			fillOpacity: 0.6,
	// 			fillColor: '#111',
	// 			color: '#999',
	// 			weight: 1,
	// 			opacity: 1
	// 		};
	//
	// 		WE.addCountries(countriesTopo, style)
	// 	});
};

const run2D = () => {
	const srid = 3035;
	const mapOptions = {};
	const lm = new LeafletMap(srid, mapOptions);

	getCountriesGeoJson()
		.then(countriesTopo => {
			const baseMaps = getBaseMaps(21);
			const style = {
				fillOpacity: 0.6,
				fillColor: 'rgb(205,170,102)',
				color: "rgb(100,100,100)",
				weight: 1,
				opacity: 1
			};
			const simple = {Simple: lm.getGeoJsonLayer(countriesTopo, style)};
			lm.addControlLayers('Simple', Object.assign(baseMaps, simple), undefined, {sortLayers: true});

			queryMeta(getStations(config))
				.then(sparqlResult => {
					const stations = new Stations(sparqlResult);

					const stationPointsOS = stations.filter({type: 'point', themeShort: 'OS'});
					const stationPointsES = stations.filter({type: 'point', themeShort: 'ES'});
					const stationPointsAS = stations.filter({type: 'point', themeShort: 'AS'});

					const styleOS = getPointStyle('OS');
					const styleES = getPointStyle('ES');
					const styleAS = getPointStyle('AS');

					console.log({stationPointsOS, stationPointsES, stationPointsAS});

					const stationLayerOS = lm.getPointsLayer(stationPointsOS, styleOS, popupContent);
					const stationLayerES = lm.getPointsLayer(stationPointsES, styleES, popupContent);
					const stationLayerAS = lm.getPointsLayer(stationPointsAS, styleAS, popupContent);

					lm.addOverlay(stationLayerOS, "Ocean stations", true);
					lm.addOverlay(stationLayerES, "Ecosystem stations", true);
					lm.addOverlay(stationLayerAS, "Atmospheric stations", true);

					// lm.addPointsLayer("Stations", stations.getList('point'), options, popupContent);
					// lm.addPoints(stations.getList('point'), options, popupContent);

					const stationLines = lm.getLines(stations.filter({type: 'line'}), {}, popupContent);
					lm.addOverlay(stationLines, "Shipping lines", true);
					// lm.addLines(stations.filter({type: 'line'}), {}, popupContent);

					if (lm.srid === 3035) {
						lm.add3035Mask();
					}
				});

		});
};

const popupContent = feature => {
	return Object.keys(feature)
		.filter(key => key === 'Country' || key === 'Site_type' || key === 'Short_name' || key === 'Long_name' || key === 'PI_names')
		.reduce((acc, key) => {
			return acc + `<div><b>${key.replace('_', ' ')}:</b> ${feature[key] || 'Not defined'}</div>`;
		}, '');
};

const getPointStyle = themeShort => {
	const style = {radius: 3, fillOpacity: 1, weight: 6, opacity: 0};

	switch(themeShort){
		case 'OS': return Object.assign(style, {fillColor: 'blue'});
		case 'ES': return Object.assign(style, {fillColor: 'green'});
		case 'AS': return Object.assign(style, {fillColor: 'white'});
	}
};

const options = point => {
	const style = {radius: 3, fillOpacity: 1, weight: 6, opacity: 0};

	switch(point.themeShort){
		case 'OS': return Object.assign(style, {fillColor: 'blue'});
		case 'ES': return Object.assign(style, {fillColor: 'green'});
		case 'AS': return Object.assign(style, {fillColor: 'white'});
	}
};

run2D();