
function handleError(error){
	console.log(error);
}

var Backend = require('./Backend.js');
var ControlsStore = require('./stores/ControlsStoreFactory.js')(Backend, handleError);
var Controls = require('./views/ControlsViewFactory.jsx')(ControlsStore);

var RasterStore = require('./stores/RasterStoreFactory.js')(
	Backend,
	Controls.actions.variableSelected,
	Controls.actions.dateSelected,
	Controls.actions.gammaSelected,
	handleError
);

var MapStore = require('./stores/MapStoreFactory.js')(Backend, RasterStore, handleError);

var Raster = require('./views/RasterViewFactory.jsx')(RasterStore);
var Map = require('./views/MapViewFactory.jsx')(MapStore);

React.render(
	<div>
		<Controls.View/>
		<div className="illustration">
			<Raster/>
			<Map/>
		</div>
	</div>,
	document.getElementById('main')
);
