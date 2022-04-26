import React, { Component } from 'react';
import { connect } from 'react-redux';
import {PortalDispatch} from "../store";
import { SavedSearch, State} from "../models/State";
import { saveSearches } from '../actions/savedSearch';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type OurProps = StateProps & DispatchProps;


class SavedSearches extends Component<OurProps> {

	render(){
		const {savedSearches} = this.props;

		console.log({savedSearches});
		
		return (
			<div>
				hehehe he
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		savedSearches: state.savedSearches,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		saveSearches: (savedSearches: SavedSearch[]) => dispatch(saveSearches(savedSearches)),
	};
}

export default connect(stateToProps, dispatchToProps)(SavedSearches);
