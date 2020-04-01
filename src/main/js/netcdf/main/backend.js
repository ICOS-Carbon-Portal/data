import {sparql, getJson, checkStatus, getUrlQuery} from 'icos-cp-backend';
import {feature} from 'topojson';
import {objectSpecification} from './sparqlQueries';
import config from '../../common/main/config';

var BinRaster = /** @class */ (function () {
	function BinRaster(arrayBuf, id) {
		var _this = this;
		this._data = new DataView(arrayBuf);
		this.id = id;
		var getHeaderValue = function (i) { return _this._data.getFloat64(i << 3, false); };
		this.height = getHeaderValue(0);
		this.width = getHeaderValue(1);
		this.stats = {
			min: getHeaderValue(2),
			max: getHeaderValue(3)
		};
		this.boundingBox = {
			latMin: getHeaderValue(4),
			latMax: getHeaderValue(5),
			lonMin: getHeaderValue(6),
			lonMax: getHeaderValue(7)
		};
	}
	BinRaster.prototype.getValue = function (y, x) {
		var i = (this.height - 1 - y) * this.width + x;
		return this._data.getFloat64((i << 3) + 64, false);
	};
	return BinRaster;
}());

function getBinRaster(id, url) {
	var keyValues = [];
	for (var _i = 2; _i < arguments.length; _i++) {
		keyValues[_i - 2] = arguments[_i];
	}
	var fullUrl = url + getUrlQuery(keyValues);
	return fetch(fullUrl, {
		headers: {
			'Accept': 'application/octet-stream'
		}
	})
		.then(checkStatus)
		.then(function (response) { return response.arrayBuffer(); })
		.then(function (response) {
			return new BinRaster(response, id || fullUrl);
		});
}

export const getRaster = (service, variable, date, elevation, gamma) => {
	const basicIdRaster = getBinRaster(null, '/netcdf/getSlice', ['service', service], ['varName', variable], ['date', date], ['elevation', elevation]);
	return basicIdRaster.then(raster => {
		raster.basicId = raster.id;
		raster.id = raster.basicId + gamma;
		return raster;
	});
};

export const getCountriesGeoJson = () => {
	return getJson('https://static.icos-cp.eu/js/topojson/readme-world.json')
		.then(topo => feature(topo, topo.objects.countries));
};

export const getVariablesAndDates = service => {
	const vars = getJson('/netcdf/listVariables', ['service', service]);
	const dates = getJson('/netcdf/listDates', ['service', service]);
	return Promise.all([vars, dates]).then(([variables, dates]) => {return {variables, dates};});
};

export const getElevations = (service, variable) => {
	return getJson('/netcdf/listElevations', ['service', service], ['varName', variable]);
};

export const getServices = () => {
	return getJson('/netcdf/listNetCdfFiles');
};

export const getTitle = (objId) => {
	const query = objectSpecification(config, objId);

	return sparql(query, config.sparqlEndpoint)
		.then(
			sparqlResult => {
				const bindings = sparqlResult.results.bindings;
				return bindings
					? Promise.resolve(bindings.map(b => b.specLabel.value))
					: Promise.reject(new Error("Could not get dobjs from meta"));
			}
		);
};

export const getTimeserie = ({objId, variable, elevation, x, y}) => {
	return getJson(`/netcdf/getCrossSection?service=${objId}&varName=${variable}&elevation=${elevation}&lonInd=${x}&latInd=${y}`);
};
