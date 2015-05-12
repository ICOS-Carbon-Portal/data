function carbonTrackerApp(){
	
	function loadServices() {
		d3.json('/carbontracker/listNetCdfFiles', function(error, data) {
			var select = document.getElementById('services');
			
			if (select.children.length > 0) {
				for (var i=select.children.length; i>-1; i--) { select.remove(i); }
			}
			
			var option = document.createElement('option');
			var content = document.createTextNode('---- select service ----');
			option.appendChild(content);
			select.appendChild(option);
			
			for (var i=0; i < data.length; i++) {
				var option = document.createElement('option');
				var content = document.createTextNode(data[i]);
				option.appendChild(content);
				select.appendChild(option);	
			}
		});
	}
	
	function loadDates(service) {
		d3.json('/carbontracker/listDates?service=' + service, function(error, data) {
			var select = document.getElementById('dates');
			
			if (select.children.length > 0) {
				for (var i=select.children.length; i>-1; i--) { select.remove(i); }
			}
			
			var option = document.createElement('option');
			var content = document.createTextNode('---- select date ----');
			option.appendChild(content);
			select.appendChild(option);		
			
			for (var i=0; i < data.length; i++) {
				var option = document.createElement('option');
				var content = document.createTextNode(data[i]);
				option.appendChild(content);
				select.appendChild(option);
			}
		});
	}
	
	function loadVariables(service) {
		d3.json('/carbontracker/listVariables?service=' + service, function(error, data) {
			var select = document.getElementById('variables');
			
			
			if (select.children.length > 0) {
				for (var i=select.children.length; i>-1; i--) { select.remove(i); }
			}
			
			var option = document.createElement('option');
			var content = document.createTextNode('---- select variable ----');
			option.appendChild(content);
			select.appendChild(option);
			
			for (var i=0; i < data.length; i++) {
				var option = document.createElement('option');
				var content = document.createTextNode(data[i]);
				option.appendChild(content);
				select.appendChild(option);
			}
		});
	}
	
	var dataFetcher = new DataFetcher('/carbontracker/getSlice');

	function getSelectedValue(elemId){
		var elem = document.getElementById(elemId); 
		return elem.options[elem.selectedIndex].value;
	}
	
	function setService() {
		var service = document.getElementById('services').options[document.getElementById('services').selectedIndex].value;
		
		if (service.match(/----/) < 1) {
			loadDates(service);
			loadVariables(service);
		}
	}
	
	function illustrate() {
		var service = getSelectedValue('services');
		var date = getSelectedValue('dates');
		var variable = getSelectedValue('variables');
		var gamma = getSelectedValue('gamma');
		
		if (service.match(/----/) < 1 && date.match(/----/) < 1 && variable.match(/----/) < 1) {
			
			var request = {
					service: service,
					date: date,
					variable: variable
			};
			
			dataFetcher.fetch(request, function(error, data) {	
				var sliceContext = document.getElementById('slice').getContext('2d');
				
				sliceContext.putImageData(makeImage(sliceContext, data, gamma), 0, 0);
				
				scale();	
			});
		
		}
			
	}
		
	function scale() {
		var scale = getSelectedValue('scale');
		
		var img = document.getElementById('slice');
		var width = img.width;
		var height = img.height;
				
		document.getElementById('canvas').width = width * scale;
		document.getElementById('canvas').height = height * scale;
		
		var context = document.getElementById('canvas').getContext('2d');
		context.scale(scale, scale);
		context.drawImage(img, 0, 0);
		
	}
	
	function makeImage(context, raster, gamma) {
		var colorMaker = getColorMaker(raster.min, raster.max, Math.abs(gamma));
			
		var array = raster.array;
		var height = array.length;
		var width = array[0].length;
	
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
			
		return imgData;
	}
	
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
				.range(["blue", "white", "red"])
				
			: d3.scale.linear()
				.domain([0, 1])
				.range(["white", "red"]);
		
		return function(value) {
			var transformed = toTransformed(value);
			var colorString = color(transformed);
			return d3.rgb(colorString);
		};
	}

	function init() {
		loadServices();
		
		document.getElementById('services').addEventListener('change', function() {
			setService();
		});
		
		['dates', 'variables', 'scale', 'gamma'].forEach(function(elemId){
			document.getElementById(elemId).addEventListener('change', illustrate);
		});
		
		
	}
	
	init();
}