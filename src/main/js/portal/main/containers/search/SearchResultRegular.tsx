import React from 'react';
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
import { getLastSegmentInUrl } from '../../utils';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingActions = {
	handlePreview: (id: UrlStr[]) => void
	handleAddToCart: (objInfo: UrlStr[]) => void
	handleAllCheckboxesChange: () => void
}
// 'secondary' makes the pane read its rows/counts from the secondary (dual-view) state slice
export type PaneSource = 'primary' | 'secondary';
// showUniqueOnly filters the pane down to data objects (compared by hash) absent from the other pane
type IncomingProps = IncomingActions & {tabHeader: string, paneSource?: PaneSource, showUniqueOnly?: boolean};
type OurProps = StateProps & DispatchProps & IncomingProps;

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
		handleAllCheckboxesChange, getAllFilteredDataObjects, exportQuery, user, showUniqueOnly, paneSource } = props;

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
				paneSource={paneSource}
			/>

			<div className="card-body pb-0">

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
							readyObjectIds={checkedObjectsInSearch}
							enabled={checkedObjectsInSearch.length > 0}
						/>

					</div>

				</div>

				{showUniqueOnly &&
					<div className="text-secondary small mb-2">
						{objectsTable.length === 1
							? "1 entry on the current page is unique to this source"
							: `${objectsTable.length} entries on the current page are unique to this source`}
					</div>
				}

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
									paneSource={paneSource}
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

// The two endpoints serve dobj URLs with different hosts, so compare by the
// data object hash (last URL segment) rather than by the full URL
function filterUniqueByHash(own: KnownDataObject[], other: KnownDataObject[]): KnownDataObject[] {
	const otherHashes = new Set(other.map(o => getLastSegmentInUrl(o.dobj)));
	return own.filter(o => !otherHashes.has(getLastSegmentInUrl(o.dobj)));
}

function stateToProps(state: State, ownProps: IncomingProps){
	const isSecondary = ownProps.paneSource === 'secondary';
	const ownObjectsTable = isSecondary ? state.secondaryObjectsTable : state.objectsTable;
	const otherObjectsTable = isSecondary ? state.objectsTable : state.secondaryObjectsTable;
	const objectsTable = ownProps.showUniqueOnly
		? filterUniqueByHash(ownObjectsTable, otherObjectsTable)
		: ownObjectsTable;
	return {
		previewLookup: state.previewLookup,
		labelLookup: state.labelLookup,
		checkedObjectsInSearch: state.checkedObjectsInSearch,
		objectsTable,
		preview: state.preview,
		cart: state.cart,
		paging: isSecondary ? state.secondaryPaging : state.paging,
		sorting: state.sorting,
		searchOptions: state.searchOptions,
		extendedDobjInfo: isSecondary ? state.secondaryExtendedDobjInfo : state.extendedDobjInfo,
		exportQuery: isSecondary ? state.secondaryExportQuery : state.exportQuery,
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
