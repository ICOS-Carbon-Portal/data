
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
var Legend = require('./views/LegendViewFactory.jsx')(RasterStore);
var Map = require('./views/MapViewFactory.jsx')(MapStore);

Raster.highlightedValueAction.listen(handleError);

React.render(
	<div>
		<Controls.View/>
		<Legend width={1000} height={45}/>
		<div className="illustration">
			<Raster.View/>
			<Map/>
		</div>
	</div>,
	document.getElementById('main')
);
