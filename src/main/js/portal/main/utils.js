
export const getNewTimeseriesUrl = (item, xAxis) => {
	return item.getNewUrl({
		objId: item.id.split('/').pop(),
		x: xAxis,
		type: 'scatter'
	});
};
