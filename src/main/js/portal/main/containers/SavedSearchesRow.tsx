import React, { Component, CSSProperties } from 'react'
import { SavedSearch } from '../models/State';



const truncateStyle: CSSProperties = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

interface OurProps {
	savedSearches: SavedSearch;
}

export default class SearchResultRegularRow extends Component<OurProps> {
	render(){
		const props = this.props;
		const savedSearches = props.savedSearches;

	return (
		<tr style={{ margin: '20px 0' }}>
			<td style={{ textAlign: 'center', width: 30, padding: '16px 0px' }}>
			<button style={{}} > Edit</button> 
	
			</td>
			
			<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 className="fs-5">
					<a title="Go to saved searches" onClick={() => location.href = savedSearches.url}>{savedSearches.label}__{savedSearches.ts}</a>
					</h4>
				<div>{savedSearches.label}</div>
				<div>{savedSearches.url}</div>

			</td>
			<td style={{ textAlign: 'center', width: 30, padding: '16px 0px' }}>
			<button style={{}} className="btn btn-primary" title="Save search in your profile">remove</button> 
			</td>
		</tr>
	)
 }

}

