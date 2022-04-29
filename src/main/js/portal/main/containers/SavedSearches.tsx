import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PortalDispatch } from "../store";
import { State } from "../models/State";
import SavedSearchesRow from './SavedSearchesRow';
// import { saveSearches } from '../actions/savedSearch';
//get the objects from the state, and table it out with label as defalut name and a  link,dada

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
export type SavedSearchesProps = StateProps & DispatchProps;


class SavedSearches extends Component<SavedSearchesProps> {

	render() {
		const { savedSearches, user } = this.props;
		const savedUrl=	savedSearches.map(s => s.url,);
		const savedLabel=	savedSearches.map(s =>s.label);

		return (
			<div>
				<h1> 	Saved Searches </h1>

				{user.email && savedSearches.length > 0 ?
					<div className="row">
						<div className="col-sm-8 col-lg-9">
							Fetching your saved searches lists:

							<table className="table">
								<tbody>{
									savedSearches.map(ss =>{
										return(
											<SavedSearchesRow savedSearches={ss} />
										)
									})
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

function dispatchToProps(dispatch: PortalDispatch | Function) {
	return {
		// saveSearches: (savedSearches: SavedSearch[]) => dispatch(saveSearches(savedSearches)),
	};
}

export default connect(stateToProps, dispatchToProps)(SavedSearches);
