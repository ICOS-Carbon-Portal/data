'use strict';

var BinRaster = require('./models/BinRaster.js');

function getJson(url, resolve, reject){
	var req = new XMLHttpRequest();
	req.open('GET', url);
	req.responseType = 'json';
	req.setRequestHeader('Accept', 'application/json');
	req.onreadystatechange = function(){
		try {
			if (req.readyState === 4) {
				if (req.status < 400 && req.status >= 200) {

					if (req.responseType === 'json')
						resolve(req.response);
					else resolve(JSON.parse(req.responseText || null));

				} else reject(new Error(req.statusText || "Ajax response status: " + req.status));
			}
		} catch (e) {
			reject(e);
		}
	};

	req.send();
}

function getBinary(url, resolve, reject){
	var req = new XMLHttpRequest();
	req.open('GET', url);
	req.responseType = 'arraybuffer';
	req.setRequestHeader('Accept', 'application/octet-stream');
	req.onreadystatechange = function(){
		try {
			if (req.readyState === 4) {
				if (req.status < 400 && req.status >= 200) {

					if (req.responseType === 'arraybuffer')
						resolve(req.response);
					else reject(new Error("Wrong response type " + req.responseType));

				} else reject(new Error(req.statusText || "Ajax response status: " + req.status));
			}
		} catch (e) {
			reject(e);
		}
	};

	req.send();
}

module.exports = {

	getServices: function(resolve, reject){
		getJson('/netcdf/listNetCdfFiles', resolve, reject);
	},

	getDates: function(service, resolve, reject){
		getJson('/netcdf/listDates?service=' + service, resolve, reject);
	},

	getVariables: function(service, resolve, reject){
		getJson('/netcdf/listVariables?service=' + service, resolve, reject);
	},

	getElevations: function(service, variable, resolve, reject){
		var url = '/netcdf/listElevations?service=' + encodeURIComponent(service) +
			"&varName=" + encodeURIComponent(variable);
		getJson(url, resolve, reject);
	},

	getRaster: function(service, variable, date, elevation, resolve, reject){
		var url = '/netcdf/getSlice?service=' + encodeURIComponent(service) +
			"&varName=" + encodeURIComponent(variable) +
			"&date=" + encodeURIComponent(date) +
			//TODO Do the undefined-controll for all variables (write own encode-function)
			"&elevation=" + encodeURIComponent(elevation == undefined ? null : elevation);
		getBinary(url, function(arrBuf){resolve(BinRaster(arrBuf));}, reject);
	},

	getCountriesTopoJson: function(resolve, reject){
		var url = 'https://static.icos-cp.eu/js/topojson/readme-world.json';
		getJson(url, resolve, reject);
	}
};

