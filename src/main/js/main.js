
function handleError(error){
	console.log(error);
}

var Backend = require('./Backend.js');
var ControlsStore = require('./stores/ControlsStoreFactory.js')(Backend, handleError);
var Controls = require('./views/ControlsViewFactory.jsx')(ControlsStore);

var RasterStore = require('./stores/RasterStoreFactory.js')(
	Backend,
	ControlsStore.serviceSelectedAction,
	Controls.actions.variableSelected,
	Controls.actions.dateSelected,
	handleError
);

RasterStore.listen(handleError);

React.render(
	React.createElement(Controls.View, null),
	document.getElementById('main')
);
