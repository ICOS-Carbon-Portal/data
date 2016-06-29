import React from 'react';
import ReactDOM from 'react-dom';
import LMap from './LMap.jsx';

module.exports = function(rasterStore, mapStore) {

	return React.createClass({
		mixins: [Reflux.connect(rasterStore)],

		render: function() {
			console.log({state: this.state});
			return (
				<LMap raster={this.state.raster} />
			);
		}
	});

}