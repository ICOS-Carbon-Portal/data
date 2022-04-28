import React, { Component } from 'react';
import { connect } from 'react-redux';
import {PortalDispatch} from "../store";
import { SavedSearch, State} from "../models/State";
// import { saveSearches } from '../actions/savedSearch';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type SavedSearchesProps = StateProps & DispatchProps;


class SavedSearches extends Component<SavedSearchesProps> {

	// handleRouteClick(newRoute: Route){
	// 	this.props.savedSearches([]);
	// 	this.props.saveSearches(newRoute);
	// }

	render(){
		const {savedSearches} = this.props;
		// const savedSearchesTitle = user.email

		console.log({savedSearches});
		
		return (
			<div>
			<h1> 	Saved Searches </h1>

       {savedSearches.length > 0 ?
			 <div className="row">
			 <div className="col-sm-8 col-lg-9">
				 Fetching lists hghghg
			 </div>
		   </div>
			 :
			 <div className="text-center" style={{margin: '5vh 0'}}>
			 <h2>Your saved Searches List is empty</h2>
			 <p>Search for data and add it to your saved search.</p>
			 {/* <button className="btn btn-primary" onClick={this.handleRouteClick.bind(this, 'search')}>
							Find data
						</button> */}
		 </div>
	}
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		user: state.user,
		savedSearches: state.savedSearches,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		// saveSearches: (savedSearches: SavedSearch[]) => dispatch(saveSearches(savedSearches)),
	};
}

export default connect(stateToProps, dispatchToProps)(SavedSearches);
