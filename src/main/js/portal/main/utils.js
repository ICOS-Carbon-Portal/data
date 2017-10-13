
export const getNewTimeseriesUrl = (item, xAxis) => {
	return item.getNewUrl({
		objId: item.id.split('/').pop(),
		x: xAxis,
		type: 'scatter'
	});
};

export const getRouteFromLocationHash = () => {
	return window.location.hash.substr(1).split('?')[0];
};
