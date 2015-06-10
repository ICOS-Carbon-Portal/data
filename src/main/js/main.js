var Actions = Reflux.createActions([
	"serviceSelected"
]);

function handleError(error){
	console.log(error);
}

var Backend = require('./Backend.js');
var ControlsStore = require('./stores/ControlsStoreFactory.js')(Backend, handleError);
var Controls = require('./views/ControlsViewFactory.jsx')(ControlsStore);

React.render(
	React.createElement(Controls.View, null),
	document.getElementById('main')
);
