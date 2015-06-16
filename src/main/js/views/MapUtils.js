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
			.range(['#91bfdb', '#ffffbf', '#fc8d59'])

		: d3.scale.linear()
			.domain([0, 0.5, 1])
			.range(['#ffeda0', '#feb24c', '#f03b20']);

	return function(value) {
		var transformed = toTransformed(value);
		var colorString = color(transformed);
		return d3.rgb(colorString);
	};
}

function makeImage(canvas, raster, gamma) {
	var stats = raster.stats;
	var colorMaker = getColorMaker(stats.min, stats.max, Math.abs(gamma));

	var array = raster.array;
	var height = array.length;
	var width = array[0].length;
	
	canvas.width = width;
	canvas.height = height;

	var context = canvas.getContext('2d');

	var imgData = context.createImageData(width, height);
	var data = imgData.data;

	var i = 0;
	for(var ib = 0; ib < data.length ; ib+=4){
		var x = i % width;
		var y = ~~(i / width); // ~~ rounds towards zero
		var value = array[height - 1 - y][x];

		var rgb = colorMaker(value);

		data[ib] = rgb.r;
		data[ib + 1] = rgb.g;
		data[ib + 2] = rgb.b;
		data[ib + 3] = 255;
		
		i++;
	}

	context.putImageData(imgData, 0, 0);
}

function draw(elem, bbox, rasterHeight) {

	elem.innerHTML = '';

	var centerLat = (bbox.latMin + bbox.latMax) / 2;
	var centerLon = (bbox.lonMin + bbox.lonMax) / 2;
	var latStep = (bbox.latMax - bbox.latMin) / (rasterHeight - 1);
	var latRange = rasterHeight * latStep;

	return new Datamap({
		element: elem,
		//responsive: true,
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
				.scale(height * 180 / latRange / Math.PI)
				.translate([width / 2, height / 2])
				.center([centerLon, centerLat]);

			return {
				path: d3.geo.path().projection(projection),
				projection: projection
			};
		}
	});
}

function getMapSizeStyle(illustrationElem, rasterWidth, rasterHeight){

	var scale = Math.min(
		illustrationElem.clientWidth / rasterWidth,
		(window.innerHeight - illustrationElem.offsetTop) / rasterHeight
	);

	var width = rasterWidth * scale;
	var height = rasterHeight * scale;

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

