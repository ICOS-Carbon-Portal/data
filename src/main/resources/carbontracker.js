function carbonTrackerApp(){

	var dataFetcher, currentBoundingBox;

	function loadServices(service) {
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
				
				if (service && service == data[i]) {
					option.setAttribute('selected', 'selected');
				}
				
				select.appendChild(option);	
			}
		});
	}
	
	function loadDates(service, date) {
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
				
				if (date && date == data[i]) {
					option.setAttribute('selected', 'selected');
				}
				
				option.appendChild(content);
				select.appendChild(option);
			}
		});
	}
	
	function loadVariables(service, variable) {
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
				
				if (variable && variable == data[i]) {
					option.setAttribute('selected', 'selected');
				}
				
				option.appendChild(content);
				select.appendChild(option);
			}
		});
	}

	function getSelectedValue(elemId){
		var elem = document.getElementById(elemId); 
		return elem.options[elem.selectedIndex].value;
	}
	
	function setService() {
		var service = getSelectedValue('services');
		
		if (service.match(/----/) < 1) {
			loadDates(service);
			loadVariables(service);
		}
	}
	
	function tryToIllustrate() {
		var service = getSelectedValue('services');
		var date = getSelectedValue('dates');
		var variable = getSelectedValue('variables');
		var gamma = getSelectedValue('gamma');

		if (service.match(/----/) < 1 && date.match(/----/) < 1 && variable.match(/----/) < 1) {
			createIllustration(service, date, variable, gamma);
		}
	}

	function createIllustration(service, date, variable, gamma) {
		var request = {
				service: service,
				date: date,
				variable: variable
		};

		dataFetcher.fetch(request, function(error, raster) {
			currentBoundingBox = raster.boundingBox;
			makeImage(raster, gamma);
		});

	}

	function makeImage(raster, gamma) {
		var stats = raster.stats;
		var colorMaker = getColorMaker(stats.min, stats.max, Math.abs(gamma));

		var array = raster.array;
		var height = array.length;
		var width = array[0].length;
		
		document.getElementById('dataimage').width = width;
		document.getElementById('dataimage').height = height;

		var context = document.getElementById('dataimage').getContext('2d');

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
		draw(raster.boundingBox);
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
				.range(['blue', 'white', 'red'])

			: d3.scale.linear()
				.domain([0, 1])
				.range(['white', 'black']);

		return function(value) {
			var transformed = toTransformed(value);
			var colorString = color(transformed);
			return d3.rgb(colorString);
		};
	}

	function draw(bbox) {
		var parent = document.getElementById('illustration');
		var canvas = document.getElementById('dataimage');

		var scale = Math.min(parent.clientWidth / canvas.width, window.innerHeight / canvas.height);

		var width = canvas.width * scale;
		var height = canvas.height * scale;

		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';

		var map = document.getElementById('map');
		map.innerHTML = '';
		map.style.width = width + 'px';
		map.style.height = height + 'px';

		var centerLat = (bbox.latMin + bbox.latMax) / 2;
		var centerLon = (bbox.lonMin + bbox.lonMax) / 2;
		var latStep = (bbox.latMax - bbox.latMin) / (canvas.height - 1);
		var latRange = canvas.height * latStep;

		var datamap = new Datamap({
			element: map,
			geographyConfig: {
				highlightOnHover: false,
				popupOnHover: false,
				borderColor: '#000000',
				hideAntarctica: false
			},
			fills: {
				defaultFill: 'rgba(0,0,0,0)'
			},
			setProjection: function(element, options) {
				var projection = d3.geo.equirectangular()
					.scale(height * 180 / latRange / Math.PI)
					.translate([width / 2, height / 2])
					.center([centerLon, centerLat]);

				var path = d3.geo.path()
					.projection(projection);

				return {path: path, projection: projection};
			}
		});
	}

	function preload(querystring) {
		// ?cppreloadslice=1&service=yearly_1x1_fluxes.nc&date=2012-07-01T14:11:43.982Z&variable=bio_flux_opt&gamma=0.2
		// ?cppreloadslice=1&service=CO2_EUROPE_LSCE.nc&date=2010-08-07T00:00:00Z&variable=FF_CO2_FLUX&gamma=0.2

		if (querystring.match(/cppreloadslice=1/)) {
			var service = '', date = '', variable = '', gamma = '1';

			var querys = querystring.split('&');

			for (var i=0; i<querys.length; i++) {
				var query = querys[i];

				if (query.match(/service/)) {
					var value = query.split('=');
					service = value[1];	
				}

				if (query.match(/date/)) {
					var value = query.split('=');
					date = value[1];	
				}

				if (query.match(/variable/)) {
					var value = query.split('=');
					variable = value[1];		
				}

				if (query.match(/gamma/)) {
					var value = query.split('=')[1];
					var elem = document.getElementById('gamma');
					var options = elem.options;

					for (var a = 0; a < options.length; a++) {
						if (options[a].value == value) {
							gamma = Number.parseFloat(value);
							elem.selectedIndex = a;
						}
					}
				}
				
			}

			loadServices(service);
			loadDates(service, date);
			loadVariables(service, variable);

			createIllustration(service, date, variable, gamma);
		}
	}

	function init() {
		dataFetcher = new DataFetcher('/carbontracker/getSlice');

		loadServices();
		
		document.getElementById('services').addEventListener('change', function() {
			setService();
		});
		
		['dates', 'variables', 'gamma'].forEach(function(elemId){
			document.getElementById(elemId).addEventListener('change', tryToIllustrate);
		});

		window.addEventListener('resize', function(){
			draw(currentBoundingBox);
		});

		preload(window.location.search);
	}

	init();
}
