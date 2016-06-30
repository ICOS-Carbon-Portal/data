import React from 'react';
import ReactDOM from 'react-dom';
import LMap from './LMap.jsx';

module.exports = function(rasterStore, mapStore) {

	return React.createClass({
		mixins: [Reflux.connect(rasterStore), Reflux.connect(mapStore)],

		render: function() {
			const state = this.state;
			// console.log({state});
			return (
				<LMap
					raster={state.raster}
					gamma={state.gamma}
					countriesTopo={state.countriesTopo}
				/>
			);
		}
	});

}