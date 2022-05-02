import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PortalDispatch } from "../store";
import { SavedSearch, State } from "../models/State";
import SavedSearchesRow from './SavedSearchesRow';
import { UrlStr } from '../backend/declarations';
import { updateSavedSearches } from '../actions/savedSearch';
//get the objects from the state, and table it out with label as defalut name and a  link,dada

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type SavedSearchesProps = StateProps & DispatchProps;


class SavedSearches extends Component<SavedSearchesProps> {

removeSavedSearch(url:UrlStr){
		const savedSearches = this.props.savedSearches;
		const foundSearchIndex = savedSearches.findIndex( ss => ss.url = url);

		if (foundSearchIndex !== -1) {
			return Promise.reject(new Error(`Could not get saved search`));
		}

		return savedSearches.slice(foundSearchIndex, 1);
	}

	// export function setCartName(newName: string): PortalThunkAction<void> {
	// 	return (dispatch, getState) => {
	// 		const state = getState();
	
	// 		dispatch(updateCart(state.user.email, state.cart.withName(newName)));
	// 	};
	// }

	render() {
		const { savedSearches, user } = this.props;
		 
		return (
			<div>
				<h1> 	Saved Searches </h1>

				{user.email && savedSearches.length > 0 ?
					<div className="row">
						<div className="col-sm-8 col-lg-9">
							Fetching your saved searches lists:

							<table className="table">
								<tbody>{
									savedSearches.map((savedSearch) =>
											{
											return <SavedSearchesRow key={savedSearch.ts} savedSearch={savedSearch} updateSavedSearches={this.removeSavedSearch.bind(this)} />;
										}
									)
								}</tbody>
							</table>

						</div>
					</div>
					:
					<div className="text-center" style={{ margin: '5vh 0' }}>
						<h2>Your saved Searches List is empty</h2>
						<p>Search for data and add it to your saved search.</p>

					</div>
				}
			</div>
		);
	}
}

function stateToProps(state: State) {
	return {
		user: state.user,
		savedSearches: state.savedSearches,
	};
}

function dispatchToProps(dispatch: PortalDispatch ) {
	return {
		updateSavedSearches: (savedSearches: SavedSearch[]) => dispatch(updateSavedSearches(savedSearches)),
		// setSavedSearches: (newName: string) => dispatch(setSavedSearchesName(newName)),
	};
}

export default connect(stateToProps, dispatchToProps)(SavedSearches);
