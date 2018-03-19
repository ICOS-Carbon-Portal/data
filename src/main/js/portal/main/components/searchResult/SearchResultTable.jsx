import React, { Component } from 'react';
import SimpleObjectTableRow from './SearchResultTableRow.jsx';
import Dropdown from '../controls/Dropdown.jsx';
import {Paging} from '../buttons/Paging.jsx';


const dropdownLookup = {
	fileName: 'File name',
	size: 'File size',
	timeStart: 'Data start date',
	timeEnd: 'Data end date',
};

export default class SimpleDataObjectsTable extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const {paging, requestStep, cart, previewAction, lookup, preview, showCount, extendedDobjInfo} = props;

		return (
			<div className="panel panel-default">
				<Paging
					paging={paging}
					showCount={showCount}
					requestStep={requestStep}
				/>

				<div className="panel-body">

					<Dropdown
						isSorter={true}
						isEnabled={props.sorting.isEnabled}
						selectedItemKey={props.sorting.varName}
						isAscending={props.sorting.ascending}
						itemClickAction={props.toggleSort}
						lookup={dropdownLookup}
					/>

					<div className="table-responsive">
						<table className="table">
							<tbody>{
								props.objectsTable.map((objInfo, i) => {
									const isAddedToCart = cart.hasItem(objInfo.dobj);
									const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);

									return (
										<SimpleObjectTableRow
											lookup={lookup}
											extendedInfo={extendedInfo}
											preview={preview}
											previewAction={previewAction}
											objInfo={objInfo}
											isAddedToCart={isAddedToCart}
											addToCart={props.addToCart}
											removeFromCart={props.removeFromCart}
											key={'dobj_' + i}
										/>
									);
								})
							}</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}
}
