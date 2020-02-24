import React from 'react';
import SearchResultTableRow from './SearchResultTableRow';
import Dropdown from '../controls/Dropdown';
import {Paging} from '../buttons/Paging';
import PreviewBtn from '../buttons/PreviewBtn';
import CartBtn from '../buttons/CartBtn';
import CheckAllBoxes from '../controls/CheckAllBoxes';
import HelpButton from '../../containers/help/HelpButton';
import {SearchActions, ReducedProps} from "../../containers/Search";
import {ObjectsTable} from "../../models/State";


const dropdownLookup = {
	fileName: 'File name',
	size: 'File size',
	timeStart: 'Data start date',
	timeEnd: 'Data end date',
	submTime: 'Submission time'
};

type OurProps = ReducedProps['searchResultTable']
	& {tabHeader: string}
	& Pick<SearchActions, 'handleViewMetadata' | 'handlePreview' | 'handleAddToCart' | 'handleAllCheckboxesChange'>;

const SimpleDataObjectsTable = (props: OurProps) => {
	const {paging, requestStep, handlePreview, lookup, labelLookup, handleViewMetadata, preview, extendedDobjInfo,
		objectsTable, checkedObjectsInSearch, sorting, toggleSort, handleAddToCart,
		updateCheckedObjects, searchOptions} = props;
	const objectText = checkedObjectsInSearch.length <= 1 ? "object" : "objects";
	const checkedObjects = checkedObjectsInSearch.reduce((acc: ObjectsTable[], uri) => {
		return acc.concat(objectsTable.filter((o: ObjectsTable) => o.dobj === uri));
	}, []);
	const datasets = checkedObjects.map((obj: ObjectsTable) => obj.dataset);
	const previewTypes = lookup ? checkedObjects.map(obj => lookup.getSpecLookupType(obj.spec)) : [];

	const handleAllCheckboxesChange = () => {
		props.handleAllCheckboxesChange();
	};

	return (
		<div className="panel panel-default">
			<Paging
				searchOptions={searchOptions}
				type="header"
				paging={paging}
				requestStep={requestStep}
			/>

			<div className="panel-body">

				<div className="panel-srollable-controls clearfix">
					<CheckAllBoxes
						checkCount={checkedObjectsInSearch.length}
						totalCount={paging.pageCount}
						onChange={handleAllCheckboxesChange}
						disabled={objectsTable.filter(o => o.level > 0).length === 0} />

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
						<CartBtn
							style={{float: 'right', marginBottom: 10}}
							checkedObjects={checkedObjectsInSearch}
							clickAction={handleAddToCart}
							enabled={checkedObjectsInSearch.length}
							type='add'
						/>

						<PreviewBtn
							style={{float: 'right', marginBottom: 10, marginRight: 10}}
							checkedObjects={checkedObjects}
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
							const isChecked = extendedInfo ?
								checkedObjectsInSearch.includes(objInfo.dobj)
								: false;

							return (
								<SearchResultTableRow
									labelLookup={labelLookup}
									extendedInfo={extendedInfo}
									viewMetadata={handleViewMetadata}
									preview={preview}
									objInfo={objInfo}
									key={'dobj_' + i}
									updateCheckedObjects={updateCheckedObjects}
									isChecked={isChecked}
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
			/>
		</div>
	);
};

export default SimpleDataObjectsTable;
