import Bbox from '../models/Bbox';

export function getColorMaker(minVal, maxVal, gamma) {

	var biLinear = (minVal < 0 && maxVal > 0);

	function transformed(value, minVal, maxVal){
		var unitIntervalValue = (value - minVal) / (maxVal - minVal);
		var gammaTransformed = Math.pow(unitIntervalValue, gamma);
		return gammaTransformed;
	}

	var toTransformed = biLinear
		? function(value){
			return value < 0
				? - transformed(-value, 0, -minVal)
				: transformed(value, 0, maxVal);
		}
		: function(value){
			return transformed(value, minVal, maxVal);
		};

	var color = biLinear
		? d3.scale.linear()
			.domain([-1, 0, 1])
			.range(['#2c7bb6', '#ffffbf', '#d7191c'])

		: d3.scale.linear()
			.domain([0, 0.5, 1])
			.range(['#ffffb2', '#fd8d3c', '#bd0026']);

	return function(value) {
		var transformed = toTransformed(value);
		var colorString = color(transformed);
		return d3.rgb(colorString);
	};
}

export function makeImage(canvas, raster, gamma) {
	var colorMaker = getColorMaker(raster.stats.min, raster.stats.max, Math.abs(gamma));

	var width = raster.width;
	canvas.width = width;
	canvas.height = raster.height;

	var context = canvas.getContext('2d');

	var imgData = context.createImageData(width, raster.height);
	var data = imgData.data;

	var i = 0;
	var white = d3.rgb('white');

	for(var ib = 0; ib < data.length ; ib+=4){
		var x = i % width;
		var y = ~~(i / width); // ~~ rounds towards zero

		var value = raster.getValue(y, x);
		var rgb = isNaN(value) ? white : colorMaker(value);

		data[ib] = rgb.r;
		data[ib + 1] = rgb.g;
		data[ib + 2] = rgb.b;
		data[ib + 3] = 255;

		i++;
	}

	context.putImageData(imgData, 0, 0);
}

export function getTileCoordBbox(tilePoint, zoom){

	const tilePoint2Lon = tileNum => tileNum / Math.pow(2, zoom) * 360 - 180;
	const tilePoint2Lat = tileNum => - tilePoint2Lon(tileNum);

	const latMax = tilePoint2Lat(tilePoint.y);
	const latMin = tilePoint2Lat(tilePoint.y + 1);
	const lonMin = tilePoint2Lon(tilePoint.x);
	const lonMax = tilePoint2Lon(tilePoint.x + 1);

	return new Bbox(lonMin, latMin, lonMax, latMax);
}

