function DataFetcher(url) {
	this.url = url;
	this.cache = {
		request: {},
		data: null
	};
}

/**
 * request: {service: string, date: string, variable: string}
 * callback: function(error, data: Raster)
 */
DataFetcher.prototype.fetch = function(request, callback){
	var self = this;
	
	if(self.needsFetching(request)) {
		
		d3.json(this.url + '?service=' + request.service + '&date=' + request.date + '&varName=' + request.variable, function(error, data){
			if(error) callback(error, null);
			else{
				self.cache.data = data;
				self.cache.request = request;
				callback(error, data);
			}
		});

	} else {
		callback(null, this.cache.data);
	}
}

DataFetcher.prototype.needsFetching = function(request){
	return !this.cache.data ||
		this.cache.request.service != request.service ||
		this.cache.request.date != request.date ||
		this.cache.request.variable != request.variable
	;
}

