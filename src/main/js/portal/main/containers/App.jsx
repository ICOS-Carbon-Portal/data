import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import DataObjectsTable from '../components/DataObjectsTable.jsx';
import {/*queryMeta, reset, */specFilterUpdate} from '../actions';

const App = props => <div className="container-fluid" style={{marginTop: 10}}>
	<AnimatedToasters
		autoCloseDelay={5000}
		toasterData={props.toasterData}
		maxWidth={400}
	/>
	<div className="row">
		<div className="col-md-4">
			<ObjSpecFilter specTable={props.specTable} updateFilter={props.updateFilter} />
		</div>
		<div className="col-md-8">
			<DataObjectsTable objectsTable={props.objectsTable} />
		</div>
	</div>
</div>;

function dispatchToProps(dispatch){
	return {
		//queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values))
	};
}

export default connect(state => state, dispatchToProps)(App);

