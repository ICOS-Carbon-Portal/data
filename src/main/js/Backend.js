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

	getRaster: function(service, variable, date, resolve, reject){
		var url = '/carbontracker/getSlice?service=' + encodeURIComponent(service) +
			"&varName=" + encodeURIComponent(variable) +
			"&date=" + encodeURIComponent(date);
		getJson(url, resolve, reject);
	}
};

