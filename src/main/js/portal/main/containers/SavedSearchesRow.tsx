import React, { Component, CSSProperties } from 'react'
import { updateSavedSearches } from '../actions/savedSearch';
import { UrlStr } from '../backend/declarations';
import { SavedSearch, State } from '../models/State';
import { PortalDispatch } from '../store';
import { SavedSearchesProps } from './SavedSearches';



// const truncateStyle: CSSProperties = {
// 	maxWidth: '100%',
// 	whiteSpace: 'nowrap',
// 	overflow: 'hidden',
// 	textOverflow: 'ellipsis'
// };

// type StateProps = ReturnType<typeof stateToProps>;
// type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = {
	key: string;
	savedSearch: SavedSearch;
	updateSavedSearches: (url: UrlStr)=> Promise<void>;
} & SavedSearchesProps

export default class SavedSearchesRow extends Component<OurProps> {	

	// handleSavedSearchName(newName: string){
	// 	if (this.props.setCartName) this.props.setCartName(newName);
	// }
	
	handleUpdateSavedSearch

	render(){
   
		const {savedSearch, updateSavedSearches} = this.props;

		function goToSearch(savedSearch: SavedSearch): void{
			location.href = savedSearch.url; 
			location.reload(); 
		 }
			 


	return (
		<tr style={{ margin: '20px 0' }}>
			<td style={{ textAlign: 'center', width: 30, padding: '16px 0px' }}>
			{/* <EditableSavedSearchName 					
					editValue={savedSearch.label}
					saveValueAction={this.	handleSavedSearchName(newName: string){
						.bind(this)}
					iconEditClass="fas fa-edit"
					iconEditTooltip="Edit download name"
					iconSaveClass="fas fa-save"
					iconSaveTooltip="Save new cart name" 
			/>  */}
	
			</td>
			
			<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 className="fs-5">
					<a title="Go to saved searches" onClick={() => {goToSearch}} >{savedSearch.label}__{savedSearch.ts}</a>
					</h4>

			</td>
			<td style={{ textAlign: 'center', width: 30, padding: '16px 0px' }}>
			<button onClick={() => updateSavedSearches(savedSearch.url)} className="btn btn-primary" title="Remove search from your profile">
					Remove
				</button>
			</td>
		</tr>
	)
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
