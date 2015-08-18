'use strict';

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

module.exports = {

	getServices: function(resolve, reject){
		getJson('/carbontracker/listNetCdfFiles', resolve, reject);
	},

	getDates: function(service, resolve, reject){
		getJson('/carbontracker/listDates?service=' + service, resolve, reject);
	},

	getVariables: function(service, resolve, reject){
		getJson('/carbontracker/listVariables?service=' + service, resolve, reject);
	},

	getElevations: function(service, variable, resolve, reject){
		var url = '/carbontracker/listElevations?service=' + encodeURIComponent(service) +
			"&varName=" + encodeURIComponent(variable);
		getJson(url, resolve, reject);
	},

	getRaster: function(service, variable, date, elevation, resolve, reject){
		if (elevation == undefined){
			elevation = "null";
		}

		var url = '/carbontracker/getSlice?service=' + encodeURIComponent(service) +
			"&varName=" + encodeURIComponent(variable) +
			"&date=" + encodeURIComponent(date) +
			"&elevation=" + encodeURIComponent(elevation);
		getJson(url, resolve, reject);
	},

	getCountriesTopoJson: function(resolve, reject){
		var url = 'https://static.icos-cp.eu/js/topojson/readme-world.json';
		getJson(url, resolve, reject);
	}
};

