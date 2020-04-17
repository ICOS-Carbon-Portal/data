
export function renderRaster(canvas, raster, colorMaker, valueFilter = v => v) {
	var width = raster.width;
	canvas.width = width;
	canvas.height = raster.height;

	var context = canvas.getContext('2d');

	var imgData = context.createImageData(width, raster.height);
	var data = imgData.data;

	var i = 0;

	for(var ib = 0; ib < data.length ; ib+=4){
		var x = i % width;
		var y = ~~(i / width); // ~~ rounds towards zero

		const value = raster.getValue(y, x);

		var rgba = colorMaker(valueFilter(value));

		data[ib] = rgba[0];
		data[ib + 1] = rgba[1];
		data[ib + 2] = rgba[2];
		data[ib + 3] = rgba[3];
		i++;
	}

	context.putImageData(imgData, 0, 0);
}

