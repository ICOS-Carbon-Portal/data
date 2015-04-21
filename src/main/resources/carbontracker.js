function whenDoneLoading(){

	var width = 800;
	var height = 600;

	var canvas = document.getElementById('c');
	var ctx = canvas.getContext('2d');
//	ctx.scale(2, 2);

	var button = document.getElementById('b');

	button.onclick = function () {
		var start = Date.now();

		var colorMaker = getColorMaker(width, height);

		var imgData = ctx.createImageData(width, height);
		var data = imgData.data;
	
		for(var i = 0; i < data.length ; i+=4){
			var rgb = colorMaker(i / 4);
		    data[i] = rgb[0];
		    data[i + 1] = rgb[1];
		    data[i + 2] = rgb[2];
		    data[i + 3] = 255;
		}
		
		ctx.putImageData(imgData, 0, 0);
		var elapsed = Date.now() - start;
		document.getElementById('output').innerHTML = "Done in " + elapsed;
	}
}

function getColorMaker(width, height){
	return function(i){
		var x = i % width;
		var y = Math.floor(i / width);
		var dx = x - width / 2;
		var dy = y - height / 2;
		var dist = Math.sqrt(dx * dx + dy * dy);
		return getRgb((dist % 100) / 100);
	};
}

function getRgb(value){
	var red = getChannelValue(value, 0.2, 0.3);
	var green = getChannelValue(value, 0.5, 0.3);
	var blue = getChannelValue(value, 0.8, 0.3);
	return [red, green, blue];
}

function getChannelValue(value, valOfMax, distForZero){
	var chanVal = 255 * (1 - Math.abs(valOfMax - value) / distForZero);
	chanVal = chanVal < 0 ? 0 : chanVal;
	return Math.round(chanVal);
}

