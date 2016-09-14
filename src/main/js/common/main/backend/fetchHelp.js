
export function checkStatus(response) {
	if(response.status >= 200 && response.status < 300)
		return response;
		else throw new Error(response.statusText || "Ajax response status: " + response.status);
}

export function getUrlQuery(keyValues){
	return !keyValues || keyValues.length == 0
		? ''
		: '?' + keyValues.map(
			([key, value]) => key + '=' + encodeURIComponent(value)
		).join('&');
}

