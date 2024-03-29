import React, {Component, CSSProperties} from 'react';
import { connect } from 'react-redux';
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {getAllFilteredDataObjects, requestStep, toggleSort} from "../../actions/search";
import {UrlStr} from "../../backend/declarations";
import {addToCart, removeFromCart} from "../../actions/common";
import config, {timezone} from "../../config";
import {Paging} from "../../components/buttons/Paging";
import SearchResultCompactRow from "../../components/searchResult/SearchResultCompactRow";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingActions = {
	handlePreview: (id: UrlStr[]) => void
}
type OurProps = StateProps & DispatchProps & IncomingActions & {tabHeader: string};

type SortProps = {
	sorting: State['sorting']
	toggleSort: (varName: string) => void
}

const headerStyle: CSSProperties = {whiteSpace: 'nowrap', paddingRight: 0, paddingBottom: 0};

class SearchResultCompact extends Component<OurProps> {
	render(){
		const {preview, cart, objectsTable, addToCart, lookup, paging, sorting, searchOptions,
			toggleSort, requestStep, removeFromCart, handlePreview,
			getAllFilteredDataObjects, exportQuery, extendedDobjInfo, user} = this.props;
		const sortProps: SortProps = {sorting, toggleSort};

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
											user={user}
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

	const glyphClass = 'fas fa-sort' + (
		sorting.varName !== props.varName
			? ''
			: sorting.ascending
				? '-amount-down-alt'
				: '-amount-down'
	);

	const style: CSSProperties = {verticalAlign: 'baseline', padding: 6};
	const sortHandler = props.toggleSort ? props.toggleSort.bind(null, props.varName) : undefined;

	return (
		<button className="btn" title="Sort" onClick={sortHandler} style={style}>
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
		user: state.user
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		toggleSort: (varName: string) => dispatch(toggleSort(varName)),
		requestStep: (direction: -1 | 1) => dispatch(requestStep(direction)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		getAllFilteredDataObjects: () => dispatch(getAllFilteredDataObjects()),
	};
}

export default connect(stateToProps, dispatchToProps)(SearchResultCompact);
