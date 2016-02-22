'use strict';

function getBinaryTable(url, tblRequest, resolve, reject){
	var req = new XMLHttpRequest();
	req.open('POST', url);
	req.responseType = 'arraybuffer';
	req.setRequestHeader('Accept', 'application/octet-stream');
	req.setRequestHeader('Content-Type', 'application/json');
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

	req.send(tblRequest);
}

export default {

	getBinaryTable: function(tblRequest, resolve, reject){
		getBinaryTable('tabular', JSON.stringify(tblRequest), resolve, reject);
	}

};

