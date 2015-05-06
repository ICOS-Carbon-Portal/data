var service = '', date = '', variable = '';

function loadServices() {
	d3.json('/carbontracker/listNetCdfFiles', function(err, data) {
		var div = document.getElementById('services');
		window.service = '';
		
		var select = document.createElement('select');
		
		var option = document.createElement('option');
		var content = document.createTextNode('---- select service ----');
		option.appendChild(content);
		select.appendChild(option);
		
		for (var i=0; i < data.length; i++) {
			var option = document.createElement('option');
			var content = document.createTextNode(data[i]);
			option.setAttribute('onclick', 'load(\'' + data[i] + '\');');
			option.appendChild(content);
			select.appendChild(option);	
		}
		
		div.appendChild(select);
	});
}

function loadDates(service) {
	d3.json('/carbontracker/listDates?service=' + service, function(err, data) {
		var div = document.getElementById('dates');
		window.date = '';
		
		var list = div.childNodes;
		for (var i=0; i<list.length; i++) {
			if (list[i].nodeName.toLowerCase() === 'select') {
				list[i].parentNode.removeChild(list[i]);
			}
		}
		
		var select = document.createElement('select');
		
		var option = document.createElement('option');
		var content = document.createTextNode('---- select date ----');
		option.appendChild(content);
		select.appendChild(option);		
		
		for (var i=0; i < data.length; i++) {
			var option = document.createElement('option');
			var content = document.createTextNode(data[i]);
			option.setAttribute('onclick', 'setDate(\'' + data[i] + '\');');
			option.appendChild(content);
			select.appendChild(option);
		}
		
		div.appendChild(select);
	});
}

function loadVariables(service) {
	d3.json('/carbontracker/listVariables?service=' + service, function(err, data) {
		var div = document.getElementById('variables');
		window.variable = '';
		
		var list = div.childNodes;
		for (var i=0; i<list.length; i++) {
			if (list[i].nodeName.toLowerCase() === 'select') {
				list[i].parentNode.removeChild(list[i]);
			}
		}
		
		var select = document.createElement('select');
		
		var option = document.createElement('option');
		var content = document.createTextNode('---- select variable ----');
		option.appendChild(content);
		select.appendChild(option);
		
		for (var i=0; i < data.length; i++) {
			var option = document.createElement('option');
			var content = document.createTextNode(data[i]);
			option.setAttribute('onclick', 'setVariable(\'' + data[i] + '\');');
			option.appendChild(content);
			select.appendChild(option);
		}
		
		div.appendChild(select);
	});
}

function init() {
	loadServices();
}

function load(service) {
	window.service = service;
	loadDates(service);
	loadVariables(service);
}

function setDate(date) {
	window.date = date;
}

function setVariable(variable) {
	window.variable = variable;
}

function illustrate() {
	if (service !== '' && date !== '' && variable !== '') {
		//alert(service + date + variable);
		
		var crarContext = document.getElementById('crar').getContext('2d');
		var context = document.getElementById('canvas').getContext('2d');

		d3.json('/carbontracker/getSlice?service='+window.service+'&date='+window.date+'&varName='+window.variable, function(err, data) {
			
			crarContext.putImageData(makeImage(crarContext, data), 0, 0);
			
			var raster = data.array;
			var width = raster[0].length;
			var height = raster.length;
			
			var scale = document.getElementById('scale').value;
			
			document.getElementById('canvas').width = width * scale;
			document.getElementById('canvas').height = height * scale;
			
			var img = document.getElementById('crar');
			context.scale(scale, scale);
			context.drawImage(img, 0, 0);
			
			
			
		});		
		
	}
}






function testFlow() {
	window.service = 'yearly_1x1_fluxes.nc';
	window.variable = 'fossil_flux_imp';
	
	d3.json('/carbontracker/listDates?service=' + service, function(err, data) {
		window.date = '';
		
		for (var i=0; i < data.length; i++) {
			
			window.date = data[i];
			//illustrate();
			
			setTimeout(function(){
				illustrate();
				document.getElementById('debug').value = 'Frame #' + i;
			}
				,4000);
			
		}
		
	});		
	
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
		
		//context.putImageData(imgData, 0, 0);
		return imgData;
}

function getColorMaker(minVal, maxVal, gamma){
	
	var data = d3.scale.linear().range([0,255]);
	data.domain([d3.min(data), d3.max(data)]);
	
	var interpolator = d3.scale.linear()
		.domain([minVal, maxVal])
		.range([0, 1]);

	var colorInt = d3.scale.linear()
		.domain([0, 1])
		.range(["white", "black"]);
	
	return function(value){
		var corrected = Math.pow(interpolator(value), gamma);
		
		
		
		//var v = Math.round(255 * corrected);
		return d3.rgb(colorInt(corrected));
		//return {r:v, g:v, b:v};
		//return d3.rgb(d3.rgb(colorInt(value)));
	};
}

