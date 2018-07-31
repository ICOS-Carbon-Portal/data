import React, { Component } from 'react';
import SearchResultTableRow from './SearchResultTableRow.jsx';
import Dropdown from '../controls/Dropdown.jsx';
import {Paging} from '../buttons/Paging.jsx';
import PreviewBtn from '../buttons/PreviewBtn.jsx';
import CartAddBtn from '../buttons/CartBtn.jsx';


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
		const {paging, requestStep, cart, previewAction, lookup, preview, extendedDobjInfo, updateCheckboxes} = props;

		return (
			<div className="panel panel-default">
				<Paging
					paging={paging}
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

					<CartAddBtn
						style={{float: 'right', marginBottom: 10}}
						checkedObjects={props.checkedObjects}
						enabled={props.checkedObjects.length}
						addToCart={props.addToCart}
					/>

					<PreviewBtn
						style={{float: 'right', marginBottom: 10, marginRight: 10}}
						checkedObjects={props.checkedObjects}
						clickAction={previewAction}
						enabled={isPreviewEnabled(props.checkedObjects.flatMap(c => props.objectsTable.filter(o => o.dobj === c)), lookup)}
					/>

					<div className="table-responsive">
						<table className="table">
							<tbody>{
								props.objectsTable.map((objInfo, i) => {
									const isAddedToCart = cart.hasItem(objInfo.dobj);
									const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);
									const isChecked = props.checkedObjects.includes(objInfo.dobj);

									return (
										<SearchResultTableRow
											lookup={lookup}
											extendedInfo={extendedInfo}
											preview={preview}
											objInfo={objInfo}
											isAddedToCart={isAddedToCart}
											removeFromCart={props.removeFromCart}
											key={'dobj_' + i}
											onCheckboxChange={this.props.handleCheckboxChange}
											isChecked={isChecked}
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

const isPreviewEnabled = (checkedObjects, lookup) => {
	return checkedObjects.length
		&& checkedObjects.reduce((acc,cur) => (lookup.getSpecLookupType(cur.spec)) ? true : false, true)
		&& checkedObjects.reduce((prev,cur) => (prev.spec === cur.spec) ? prev : false);
}
