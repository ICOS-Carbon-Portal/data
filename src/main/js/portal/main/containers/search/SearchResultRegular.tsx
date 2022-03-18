import React, {Component} from 'react';
import { connect } from 'react-redux';
import { ObjectsTable, State, ExtendedDobjInfo} from "../../models/State";
import {PortalDispatch} from "../../store";
import {getAllFilteredDataObjects, requestStep, toggleSort, updateCheckedObjectsInSearch} from "../../actions/search";
import {UrlStr} from "../../backend/declarations";
import {Paging} from "../../components/buttons/Paging";
import CheckAllBoxes from "../../components/controls/CheckAllBoxes";
import Dropdown from "../../components/controls/Dropdown";
import CartBtn from "../../components/buttons/CartBtn";
import PreviewBtn from "../../components/buttons/PreviewBtn";
import HelpButton from "../help/HelpButton";
import SearchResultRegularRow from "../../components/searchResult/SearchResultRegularRow";
import { addingToCartProhibition } from '../../models/CartItem';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingActions = {
	handlePreview: (id: UrlStr[]) => void
	handleAddToCart: (objInfo: UrlStr[]) => void
	handleAllCheckboxesChange: () => void
}
type OurProps = StateProps & DispatchProps & IncomingActions & {tabHeader: string};

const dropdownLookup = {
	fileName: 'File name',
	size: 'File size',
	timeStart: 'Data start date',
	timeEnd: 'Data end date',
	submTime: 'Submission time'
};

class SearchResultRegular extends Component<OurProps> {
	render(){
		const {preview, objectsTable, previewLookup, paging, sorting, searchOptions,
			toggleSort, requestStep, labelLookup, checkedObjectsInSearch, extendedDobjInfo,
			updateCheckedObjects, handlePreview, handleAddToCart,
			handleAllCheckboxesChange, getAllFilteredDataObjects, exportQuery, user } = this.props;

		const objectText = checkedObjectsInSearch.length <= 1 ? "object" : "objects";
		const checkedObjects = checkedObjectsInSearch.reduce<ObjectsTable[]>((acc, uri) => {
			return acc.concat(objectsTable.filter(o => o.dobj === uri));
		}, []);
		const datasets = checkedObjects.map((obj: ObjectsTable) => obj.dataset);
		const previewTypes = previewLookup ? checkedObjects.map(obj => previewLookup.forDataObjSpec(obj.spec)?.type) : [];
		const isL3Previewable = previewLookup ? checkedObjects.map(obj => previewLookup.hasVarInfo(obj.dobj) ?? false) : [];

		return (
			<div className="card">
				<Paging
					searchOptions={searchOptions}
					type="header"
					paging={paging}
					requestStep={requestStep}
					getAllFilteredDataObjects={getAllFilteredDataObjects}
					exportQuery={exportQuery}
				/>

				<div className="card-body">

					<div className="panel-srollable-controls clearfix">
						<CheckAllBoxes
							checkCount={checkedObjectsInSearch.length}
							totalCount={paging.pageCount}
							onChange={handleAllCheckboxesChange}
							disabled={objectsTable.every(o => !addingToCartProhibition(o).allowCartAdd)} />

						<Dropdown
							isSorter={true}
							isEnabled={true}
							selectedItemKey={sorting.varName}
							isAscending={sorting.ascending}
							itemClickAction={toggleSort}
							lookup={dropdownLookup}
						/>

						{ checkedObjectsInSearch.length > 0 &&
						<span style={{marginLeft: 16, verticalAlign: 7}}>{checkedObjectsInSearch.length} {objectText} selected</span>
						}

						<div style={{float: 'right'}}>

							{user.email &&
								<CartBtn
									style={{float: 'right', marginBottom: 10}}
									checkedObjects={checkedObjectsInSearch}
									clickAction={handleAddToCart}
									enabled={checkedObjectsInSearch.length > 0}
									type='add'
								/>
							}

							<PreviewBtn
								style={{float: 'right', marginBottom: 10, marginRight: 10}}
								checkedObjects={checkedObjects}
								isL3Previewable={isL3Previewable}
								datasets={datasets}
								previewTypes={previewTypes}
								clickAction={handlePreview}
							/>

							<div style={{float: 'right', position:'relative', top:7, marginRight: 10}}>

								<HelpButton
									name={'preview'}
									title="View help about Preview"
								/>

							</div>
						</div>

					</div>

					<table className="table">
						<tbody>{
							objectsTable.map((objInfo: ObjectsTable, i) => {
								const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);

								return extendedInfo && (
									<SearchResultRegularRow
										labelLookup={labelLookup}
										extendedInfo={extendedInfo}
										preview={preview}
										objInfo={objInfo}
										key={'dobj_' + i}
										updateCheckedObjects={updateCheckedObjects}
										isChecked={checkedObjectsInSearch.includes(objInfo.dobj)}
										checkedObjects={checkedObjects}
									/>
								);
							})
						}</tbody>
					</table>
				</div>
				<Paging
					searchOptions={undefined}
					type="footer"
					paging={paging}
					requestStep={requestStep}
					getAllFilteredDataObjects={getAllFilteredDataObjects}
					exportQuery={exportQuery}
				/>
			</div>
		);
	}
}

function stateToProps(state: State){
	return {
		previewLookup: state.previewLookup,
		labelLookup: state.labelLookup,
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		objectsTable: state.objectsTable,
		preview: state.preview,
		cart: state.cart,
		paging: state.paging,
		sorting: state.sorting,
		searchOptions: state.searchOptions,
		extendedDobjInfo: state.extendedDobjInfo,
		exportQuery: state.exportQuery,
		user: state.user
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateCheckedObjects: (ids: UrlStr[] | UrlStr) => dispatch(updateCheckedObjectsInSearch(ids)),
		toggleSort: (varName: string) => dispatch(toggleSort(varName)),
		requestStep: (direction: -1 | 1) => dispatch(requestStep(direction)),
		getAllFilteredDataObjects: () => dispatch(getAllFilteredDataObjects()),
	};
}

export default connect(stateToProps, dispatchToProps)(SearchResultRegular);
