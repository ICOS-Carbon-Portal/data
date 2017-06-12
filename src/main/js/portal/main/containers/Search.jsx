import React, { Component } from 'react';
import { connect } from 'react-redux';
import {copyprops} from 'icos-cp-utils';
import ObjSpecFilter from '../components/ObjSpecFilter.jsx';
import DataObjectsTable from '../components/DataObjectsTable.jsx';
import {/*queryMeta, reset, */specFilterUpdate, toggleSort, requestStep} from '../actions';

class Search extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		const props = this.props;

		return (
			<div className="row">
				<div className="col-md-4">
					<ObjSpecFilter {...copyprops(props, ['specTable', 'updateFilter'])} />
				</div>
				<div className="col-md-8">
					<DataObjectsTable {...copyprops(props, ['objectsTable', 'toggleSort', 'sorting', 'requestStep', 'paging'])}/>
				</div>
			</div>
		);
	}
}

function dispatchToProps(dispatch){
	return {
		//queryMeta: (id, search, minLength) => dispatch(queryMeta(id, search, minLength)),
		updateFilter: (varName, values) => dispatch(specFilterUpdate(varName, values)),
		toggleSort: varName => dispatch(toggleSort(varName)),
		requestStep: direction => dispatch(requestStep(direction))
	};
}

export default connect(state => state, dispatchToProps)(Search);