import React, {Component, useState} from 'react';
import { connect } from 'react-redux';
import { KnownDataObject, State} from "../../models/State";
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
import DownloadButton from '../../components/buttons/DownloadButton';
import { useDownloadInfo } from '../../hooks/useDownloadInfo';


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

function SearchResultRegular(props: OurProps) {
	const {preview, objectsTable, previewLookup, paging, sorting, searchOptions,
		toggleSort, requestStep, labelLookup, checkedObjectsInSearch, extendedDobjInfo,
		updateCheckedObjects, handlePreview, handleAddToCart,
		handleAllCheckboxesChange, getAllFilteredDataObjects, exportQuery, user } = props;

	const objectText = checkedObjectsInSearch.length <= 1 ? "object" : "objects";
	const checkedUriSet = new Set<string>(checkedObjectsInSearch);
	const checkedObjects = objectsTable.filter(o => checkedUriSet.has(o.dobj));

	const { filename } = useDownloadInfo({readyObjectIds: checkedObjectsInSearch, objectsTable, 	
		extendedDobjInfo, labelLookup});

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

				<div className="panel-srollable-controls d-flex justify-content-between flex-wrap">
					<div className="d-flex mb-2">
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

						{checkedObjectsInSearch.length > 0 &&
							<span style={{ marginLeft: 12, marginTop: 7 }}>{checkedObjectsInSearch.length} {objectText} selected</span>
						}
					</div>

					<div className="d-flex mb-3">

						<div style={{position:'relative', top:7, margin: '0 10px'}}>
							<HelpButton
								name={'preview'}
								title="View help about Preview"
								overrideStyles={{ paddingLeft: 0 }}
							/>
						</div>

						<PreviewBtn
							style={{ marginRight: 10 }}
							checkedObjects={checkedObjects}
							previewLookup={previewLookup}
							clickAction={handlePreview}
						/>

						{user.email &&
							<CartBtn
								style={{ marginRight: 10 }}
								checkedObjects={checkedObjectsInSearch}
								clickAction={handleAddToCart}
								enabled={checkedObjectsInSearch.length > 0}
								type='add'
							/>
						}

						<DownloadButton
							style={{}}
							filename={filename}
							enabled={checkedObjectsInSearch.length > 0}
							readyObjectIds={checkedObjectsInSearch}
						/>

					</div>

				</div>

				<div>
					{
						objectsTable.map((objInfo: KnownDataObject, i) => {
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
									isCartView={false}
								/>
							);
						})
					}
				</div>
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
