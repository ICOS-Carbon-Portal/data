function getColorMaker(minVal, maxVal, gamma) {

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

function makeImage(canvas, raster, gamma) {
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

function draw(elem, bbox, rasterSize) {

	elem.innerHTML = '';

	var centerLon = (bbox.lonMin + bbox.lonMax) / 2;
	var centerLat = (bbox.latMin + bbox.latMax) / 2;
	var lonStep = (bbox.lonMax - bbox.lonMin) / (rasterSize.width - 1);
	var latStep = (bbox.latMax - bbox.latMin) / (rasterSize.height - 1);
	var lonRange = rasterSize.width * lonStep;
	var latRange = rasterSize.height * latStep;

	var lonMin = centerLon - lonRange / 2;
	var lonMax = lonMin + lonRange;
	var latMin = centerLat - latRange / 2;
	var latMax = latMin + latRange;

	var rotateLon = lonMax > 180 ? 180 - lonMax : lonMin < -180 ? -180 - lonMin : 0;
	var rotateLat = latMax > 90 ? 90 - latMax : latMin < -90 ? -90 - latMin : 0;

	return new Datamap({
		element: elem,
		geographyConfig: {
			highlightOnHover: false,
			popupOnHover: false,
			borderColor: '#000000',
			hideAntarctica: false
		},
		scope: 'countries',
		fills: {
			defaultFill: 'rgba(0,0,0,0)'
		},
		setProjection: function(element, options) {

			var width = element.clientWidth;
			var height = element.clientHeight;

			var projection = d3.geo.equirectangular()
				.rotate([rotateLon, rotateLat])
				.center([centerLon + rotateLon, centerLat + rotateLat])
				.scale(height * 180 / latRange / Math.PI)
				.translate([width / 2, height / 2]);

			return {
				path: d3.geo.path().projection(projection),
				projection: projection
			};
		}
	});
}

function getMapSizeStyle(illustrationElem, rasterSize){

	var scale = Math.min(
		illustrationElem.clientWidth / rasterSize.width,
		(window.innerHeight - illustrationElem.offsetTop) / rasterSize.height
	);

	var width = rasterSize.width * scale;
	var height = rasterSize.height * scale;

	return {
		width: width + 'px',
		height: height + 'px'
	};
}

module.exports = {
	getColorMaker: getColorMaker,
	makeImage: makeImage,
	draw: draw,
	getMapSizeStyle: getMapSizeStyle
};

