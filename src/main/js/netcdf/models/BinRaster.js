module.exports = function(arrayBuf){
	var data = new DataView(arrayBuf);

	function getHeaderValue(i){
		return data.getFloat64(i << 3, false);
	}

	var height = getHeaderValue(0);
	var width = getHeaderValue(1);

	return {
		getValue: function(y, x){ //e.g. y for lat, x for lon
			var i = (height - 1 - y) * width + x;
			return data.getFloat64((i << 3) + 64, false);
		},
		stats: {
			min: getHeaderValue(2),
			max: getHeaderValue(3)
		},
		boundingBox: {
			latMin: getHeaderValue(4),
			latMax: getHeaderValue(5),
			lonMin: getHeaderValue(6),
			lonMax: getHeaderValue(7)
		},
		height: height,
		width: width
	};
}
