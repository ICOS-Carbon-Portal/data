import React, { Component } from 'react';
import SearchResultTableRow from './SearchResultTableRow.jsx';
import Dropdown from '../controls/Dropdown.jsx';
import {Paging} from '../buttons/Paging.jsx';
import PreviewBtn from '../buttons/PreviewBtn.jsx';
import CartBtn from '../buttons/CartBtn.jsx';


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
		const {paging, requestStep, previewAction, lookup, preview, extendedDobjInfo} = props;

		return (
			<div className="panel panel-default">
				<Paging
					paging={paging}
					requestStep={requestStep}
				/>

				<div className="panel-body">

					<div className="panel-srollable-controls clearfix">
						<Dropdown
							isSorter={true}
							isEnabled={props.sorting.isEnabled}
							selectedItemKey={props.sorting.varName}
							isAscending={props.sorting.ascending}
							itemClickAction={props.toggleSort}
							lookup={dropdownLookup}
						/>


					<PreviewBtn
						style={{float: 'right', marginBottom: 10, marginRight: 10}}
						checkedObjects={props.checkedObjectsInSearch.flatMap(c => props.objectsTable.filter(o => o.dobj === c))}
						clickAction={previewAction}
						lookup={props.lookup}
					/>
						<div style={{float: 'right'}}>
							<CartBtn
								style={{float: 'right', marginBottom: 10}}
								checkedObjects={props.checkedObjectsInSearch}
								clickAction={props.handleAddToCart}
								enabled={props.checkedObjectsInSearch.length}
								type='add'
							/>

							<PreviewBtn
								style={{float: 'right', marginBottom: 10, marginRight: 10}}
								checkedObjects={props.checkedObjectsInSearch.flatMap(c => props.objectsTable.filter(o => o.dobj === c))}
								clickAction={previewAction}
								lookup={props.lookup}
							/>
						</div>
					</div>

					<div className="table-responsive">
						<table className="table">
							<tbody>{
								props.objectsTable.map((objInfo, i) => {
									const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);
									const isChecked = props.checkedObjectsInSearch.includes(objInfo.dobj);

									return (
										<SearchResultTableRow
											lookup={lookup}
											extendedInfo={extendedInfo}
											preview={preview}
											objInfo={objInfo}
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
