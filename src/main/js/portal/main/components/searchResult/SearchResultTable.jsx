import React, { Component } from 'react';
import SearchResultTableRow from './SearchResultTableRow.jsx';
import Dropdown from '../controls/Dropdown.jsx';
import {Paging} from '../buttons/Paging.jsx';
import PreviewBtn from '../buttons/PreviewBtn.jsx';
import CartBtn from '../buttons/CartBtn.jsx';
import CheckAllBoxes from '../controls/CheckAllBoxes.jsx';
import HelpButton from '../help/HelpButton.jsx';


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

	handleAllCheckboxesChange() {
		this.props.handleAllCheckboxesChange();
	}

	render(){
		const props = this.props;
		const {paging, requestStep, previewAction, lookup, preview, extendedDobjInfo, helpStorage, getResourceHelpInfo} = props;
		const objectText = props.checkedObjectsInSearch.length <= 1 ? "object" : "objects";
		const checkedObjects = props.checkedObjectsInSearch.reduce((acc, uri) => {
				return acc.concat(props.objectsTable.filter(o => o.dobj === uri));
			}, []);

		return (
			<div className="panel panel-default">
				<Paging
					paging={paging}
					requestStep={requestStep}
				/>

				<div className="panel-body">

					<div ref={div => this.stickyHeader = div} className="panel-srollable-controls clearfix">
						<CheckAllBoxes
							checkCount={props.checkedObjectsInSearch.length}
							totalCount={paging.pageCount}
							onChange={this.props.handleAllCheckboxesChange} />

						<Dropdown
							isSorter={true}
							isEnabled={props.sorting.isEnabled}
							selectedItemKey={props.sorting.varName}
							isAscending={props.sorting.ascending}
							itemClickAction={props.toggleSort}
							lookup={dropdownLookup}
						/>

						{ props.checkedObjectsInSearch.length > 0 &&
							<span style={{marginLeft: 16, verticalAlign: 7}}>{props.checkedObjectsInSearch.length} {objectText} selected</span>
						}

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
								checkedObjects={checkedObjects}
								clickAction={previewAction}
								lookup={props.lookup}
							/>

							<div style={{float: 'right', position:'relative', top:7, marginRight: 10}}>
								<HelpButton
									isActive={helpStorage.isActive('preview')}
									helpItem={helpStorage.getHelpItem('preview')}
									title="View help about Preview"
									getResourceHelpInfo={getResourceHelpInfo}
								/>
							</div>
						</div>

					</div>



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
										updateCheckedObjects={this.props.updateCheckedObjects}
										isChecked={isChecked}
										checkedObjects={checkedObjects}
									/>
								);
							})
						}</tbody>
					</table>
				</div>
			</div>
		);
	}
}
