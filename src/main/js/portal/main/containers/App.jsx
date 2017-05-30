import React, { Component } from 'react';
import { connect } from 'react-redux';
import {AnimatedToasters} from 'icos-cp-toaster';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import {/*queryMeta, reset, */specFilterUpdate} from '../actions';

const App = props => <div className="container" style={{marginTop: 10}}>
	<AnimatedToasters
		autoCloseDelay={5000}
		toasterData={props.toasterData}
		maxWidth={400}
	/>
	<ObjSpecFilter specTable={props.specTable} updateFilter={props.updateFilter} />
</div>;

function dispatchToProps(dispatch){
	return {
		//queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values))
	};
}

export default connect(state => state, dispatchToProps)(App);

