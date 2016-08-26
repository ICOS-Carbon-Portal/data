/*
import React from 'react';
import ReactDOM from 'react-dom';
import mapStoreFactory from './stores/MapStoreFactory';
import rasterStoreFactory from './stores/RasterStoreFactory';
import controlsStoreFactory from './stores/ControlsStoreFactory';

function handleError(error){
	console.log(error);
}

var actions = Reflux.createActions([
	"dateSelected", "variableSelected", "elevationSelected", "gammaSelected", "serviceSelected", "highlightedValueAction"
]);


const ControlsStore = controlsStoreFactory(handleError, actions);
var Controls = require('./views/ControlsViewFactory.jsx')(ControlsStore, actions);

const RasterStore = rasterStoreFactory(actions, handleError);
const MapStore = mapStoreFactory(RasterStore, handleError);

var Legend = require('./views/LegendViewFactory.jsx')(RasterStore, actions.highlightedValueAction);

var LMapContainer = require('./views/LMapContainerFactory.jsx')(RasterStore, MapStore);

ReactDOM.render(
	<div style={{width:'100%', height: '100%'}}>
		<Controls.View/>
		<Legend width={1000} height={45}/>
		<div className="illustration">
			<LMapContainer />
		</div>
	</div>,
	document.getElementById('main')
);
*/

import 'babel-polyfill';
import React from 'react';
import {render} from 'react-dom';
import Root from './containers/Root.jsx';

render(
	<Root />,
	document.getElementById('main')
);