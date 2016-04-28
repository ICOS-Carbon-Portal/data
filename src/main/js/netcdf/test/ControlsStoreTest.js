Reflux = require('reflux');
var factory = require('../../main/js/stores/ControlsStoreFactory.js');

function noop() {}


describe("Controls Store", function() {

	it("fetches and publishes the list of services after creation", function(done) {
		var store = factory(backend, noop);
		store.listen(
			function(storeState) {
				expect(storeState.services).toEqual(['service 1', 'service 2']);
				done();			
			}
		);
	});


	it("fetches dates and variables after service has been chosen", function(done) {
		var store = factory(backend, noop);

		var callNumber = 0;

		store.listen(
			function(storeState) {
				callNumber++;
				if(callNumber === 1) store.serviceSelectedAction('service 2');
				else { // callNumber > 1
					expect(storeState.dates).toEqual(['2015-06-10', '2015-06-20']);
					expect(storeState.variables).toEqual(['variable 1', 'variable 2']);
					done();
				}
			}
		);
	});




});



var backend = {
	getServices: function(resolve, reject){
		setTimeout(
			function() {
				resolve(['service 1', 'service 2']);
			},
		
			2
		);
		
	},

	getDates: function(service, resolve, reject){
		resolve(['2015-06-10', '2015-06-20']);
	},

	getVariables: function(service, resolve, reject){
		resolve(['variable 1', 'variable 2']);
	},

	getRaster: function(service, variable, date, resolve, reject){
		resolve({});
	}
};
