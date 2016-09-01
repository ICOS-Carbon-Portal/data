
function getColorMaker(minVal, maxVal, gamma) {

	function transform(value){
		var unit = (value - minVal) / (maxVal - minVal);
		var unitIntervalValue = unit < 0 ? 0 : unit > 1 ? 1 : unit;
		var gammaTransformed = Math.pow(unitIntervalValue, gamma);
		return gammaTransformed;
	}

	var color = d3.scale.linear()
		.domain([0, 0.5, 1])
		.range(['#ffffb2', '#fd8d3c', '#bd0026']);

	return function(value) {
		var transformed = transform(value);
		var colorString = color(transformed);
		return d3.rgb(colorString);
	};
}

export function makeImage(canvas, raster, gamma) {
	var colorMaker = getColorMaker(-5, 0, Math.abs(gamma));

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
		var rgb = isNaN(value) || value <= 0 ? white : colorMaker(Math.log10(value));

		data[ib] = rgb.r;
		data[ib + 1] = rgb.g;
		data[ib + 2] = rgb.b;
		data[ib + 3] = 255;

		i++;
	}

	context.putImageData(imgData, 0, 0);
}


