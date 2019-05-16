
export const getNewTimeseriesUrl = (items, xAxis) => {
	const objIds = items.map(item => item.id.split('/').pop()).join();
	return items[0].getNewUrl({
		objId: objIds,
		x: xAxis,
		type: 'scatter'
	});
};

export const getRouteFromLocationHash = () => {
	return window.location.hash.substr(1).split('?')[0];
};

export const formatBytes = (bytes, decimals = 2) => {
	if (isNaN(bytes)) return "";
	if(bytes === 0) return '0 Bytes';

	const k = 1024,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

export const varType = variable => {
	const isString = typeof variable === 'string';
	if (isString) return 'string';

	const isArray = Array.isArray(variable);
	if (isArray) return 'array';

	const isPlainObject = variable !== null && typeof variable === 'object' && !Array.isArray(variable);
	if (isPlainObject) return 'object';

	return 'unknown';
};

export const isSmallDevice = _ => {
	return window.innerWidth <= 768;
};

export const formatDateWithOptionalTime = d => {
	if(!d) return '';

	const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
	const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;

	return time === "00:00" ? `${date}` : `${date} ${time}`;
};

export const formatDate = d => {
	if (!d) return '';

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

export const formatDateTime = d => {
	if (!d) return '';

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
};

const pad2 = s => {
	return ("0" + s).substr(-2, 2);
};
