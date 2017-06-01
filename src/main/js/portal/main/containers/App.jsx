import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import DataObjectsTable from '../components/DataObjectsTable.jsx';
import {/*queryMeta, reset, */specFilterUpdate, toggleSort, requestStep} from '../actions';

const App = props => <div className="container-fluid" style={{marginTop: 10}}>
	<AnimatedToasters
		autoCloseDelay={5000}
		toasterData={props.toasterData}
		maxWidth={400}
	/>
	<div className="row">
		<div className="col-md-4">
			<ObjSpecFilter {...copyprops(props, ['specTable', 'updateFilter'])} />
		</div>
		<div className="col-md-8">
			<DataObjectsTable {...copyprops(props, ['objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging'])}/>
		</div>
	</div>
</div>;

function dispatchToProps(dispatch){
	return {
		//queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values)),
		toggleSort: varName => dispatch(toggleSort(varName)),
		requestStep: direction => dispatch(requestStep(direction))
	};
}

export default connect(state => state, dispatchToProps)(App);

