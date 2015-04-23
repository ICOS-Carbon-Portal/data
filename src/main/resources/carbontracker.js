function whenDoneLoading(){

	var width = 360;
	var height = 180;

	var canvas = document.getElementById('c');
	var ctx = canvas.getContext('2d');
	var rasterCache;

	var button = document.getElementById('b');
	button.onclick = function () {
		var start = Date.now();

		d3.json("/getSlice?service=service1&slice=2001-07-01T17:04:15.484Z", function(err, raster){
			rasterCache = raster;
			makeImage(ctx, raster);
			var elapsed = Date.now() - start;
			document.getElementById('output').innerHTML = "Done in " + elapsed;
		});
		
	}
	var redrawButton = document.getElementById('redrawButton');
	redrawButton.onclick = function(){
		var start = Date.now();
		makeImage(ctx, rasterCache);
		var elapsed = Date.now() - start;
		document.getElementById('output').innerHTML = "Done in " + elapsed;
	};
}

function makeImage(context, raster){
		var gamma = document.getElementById('gammaValue').value;
		var colorMaker = getColorMaker(raster.min, raster.max, gamma);

		var array = raster.array;
		var height = array.length;
		var width = array[0].length;

		var imgData = context.createImageData(width, height);
		var data = imgData.data;

		var i = 0;
		for(var ib = 0; ib < data.length ; ib+=4){
			var x = i % width;
			var y = ~~(i / width);
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

function getColorMaker(minVal, maxVal, gamma){
	var interpolator = d3.scale.linear()
		.domain([minVal, maxVal])
		.range([0, 1]);

	return function(value){
		var corrected = Math.pow(interpolator(value), gamma);
		var v = 255 - Math.round(255 * corrected);
		return {r:v, g:v, b:v};
	};
}

