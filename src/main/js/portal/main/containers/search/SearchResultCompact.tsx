import React, {Component, CSSProperties} from 'react';
import { connect } from 'react-redux';
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {getAllFilteredDataObjects, requestStep, toggleSort} from "../../actions/search";
import {UrlStr} from "../../backend/declarations";
import {addToCart, removeFromCart, setMetadataItem} from "../../actions/common";
import config, {timezone} from "../../config";
import {Paging} from "../../components/buttons/Paging";
import SearchResultCompactRow from "../../components/searchResult/SearchResultCompactRow";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingActions = {
	handleViewMetadata: (id: UrlStr) => void
	handlePreview: (id: UrlStr[]) => void
}
type OurProps = StateProps & DispatchProps & IncomingActions & {tabHeader: string};

type SortProps = {
	sorting: State['sorting']
	toggleSort: (varName: string) => void
}

const headerStyle: CSSProperties = {whiteSpace: 'nowrap', paddingRight: 0};

class SearchResultCompact extends Component<OurProps> {
	render(){
		const {preview, cart, objectsTable, addToCart, lookup, paging, sorting, searchOptions,
			toggleSort, requestStep, removeFromCart, handleViewMetadata, handlePreview,
			getAllFilteredDataObjects, exportQuery, extendedDobjInfo} = this.props;
		const sortProps: SortProps = {sorting, toggleSort};

		return (
			<div className="panel panel-default">
				<Paging
					searchOptions={searchOptions}
					type="header"
					paging={paging}
					requestStep={requestStep}
					getAllFilteredDataObjects={getAllFilteredDataObjects}
					exportQuery={exportQuery}
				/>

				<div className="panel-body">
					<div className="table-responsive">
						<table className="table">
							<thead>
							<tr>
								<th style={headerStyle}>
									Data object<SortButton varName="fileName" {...sortProps}/>
								</th>
								<th style={headerStyle}>
									Size<SortButton varName="size" {...sortProps}/>
								</th>
								<th style={headerStyle}>
									Submission time ({timezone[config.envri].label})<SortButton varName="submTime" {...sortProps}/>
								</th>
								<th style={headerStyle}>
									From time ({timezone[config.envri].label})<SortButton varName="timeStart" {...sortProps}/>
								</th>
								<th style={headerStyle}>
									To time ({timezone[config.envri].label})<SortButton varName="timeEnd" {...sortProps}/>
								</th>
							</tr>
							</thead>
							<tbody>{
								objectsTable.map((objInfo, i) => {
									const isAddedToCart = cart.hasItem(objInfo.dobj);

									return (
										<SearchResultCompactRow
											lookup={lookup}
											preview={preview}
											extendedDobjInfo={extendedDobjInfo}
											handlePreview={handlePreview}
											objInfo={objInfo}
											isAddedToCart={isAddedToCart}
											addToCart={addToCart}
											removeFromCart={removeFromCart}
											key={'dobj_' + i}
											handleViewMetadata={handleViewMetadata}
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

const SortButton: React.FunctionComponent<SortProps & {varName: string}> = props => {
	const sorting = props.sorting || {} as State['sorting'];

	const glyphClass = 'glyphicon glyphicon-sort' + (
		sorting.varName !== props.varName
			? ''
			: sorting.ascending
				? '-by-attributes'
				: '-by-attributes-alt'
	);

	const style: CSSProperties = {pointerEvents: 'auto', borderWidth: 0, padding: 6};
	const sortHandler = props.toggleSort ? props.toggleSort.bind(null, props.varName) : undefined;

	return (
		<button className="btn btn-default" title="Sort" onClick={sortHandler} style={style}>
			<span className={glyphClass} />
		</button>
	);
};

function stateToProps(state: State){
	return {
		lookup: state.previewLookup,
		objectsTable: state.objectsTable,
		preview: state.preview,
		cart: state.cart,
		paging: state.paging,
		sorting: state.sorting,
		searchOptions: state.searchOptions,
		exportQuery: state.exportQuery,
		extendedDobjInfo: state.extendedDobjInfo,
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		toggleSort: (varName: string) => dispatch(toggleSort(varName)),
		requestStep: (direction: -1 | 1) => dispatch(requestStep(direction)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		getAllFilteredDataObjects: () => dispatch(getAllFilteredDataObjects()),
	};
}

export default connect(stateToProps, dispatchToProps)(SearchResultCompact);
