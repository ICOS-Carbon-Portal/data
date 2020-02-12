import React, { CSSProperties } from 'react';
import CompactSearchResultTableRow from './CompactSearchResultTableRow';
import {Paging} from '../buttons/Paging';
import { SearchActions, ReducedProps } from "../../containers/Search";
import { State } from '../../models/State';
import config, { timezone } from '../../config';

type CompactSearchResultTableProps = ReducedProps['compactSearchResultTable']
	& { tabHeader: string }
	& Pick<SearchActions, 'handleViewMetadata' | 'handlePreview'>;

const CompactSearchResultTable = (props: CompactSearchResultTableProps) => {
	const { paging, requestStep, cart, handlePreview, lookup, preview, handleViewMetadata, searchOptions} = props;
	const headerStyle: CSSProperties = {whiteSpace: 'nowrap', paddingRight: 0};

	return <div className="panel panel-default">
		<Paging
			searchOptions={searchOptions}
			type="header"
			paging={paging}
			requestStep={requestStep}
		/>

		<div className="panel-body">
			<div className="table-responsive">
				<table className="table">
					<thead>
						<tr>
							<th style={headerStyle}>Data object<SortButton varName="fileName" {...props}/></th>
							<th style={headerStyle}>Size<SortButton varName="size" {...props}/></th>
							<th style={headerStyle}>Submission time ({timezone[config.envri].label})<SortButton varName="submTime" {...props}/></th>
							<th style={headerStyle}>From time ({timezone[config.envri].label})<SortButton varName="timeStart" {...props}/></th>
							<th style={headerStyle}>To time ({timezone[config.envri].label})<SortButton varName="timeEnd" {...props}/></th>
						</tr>
					</thead>
					<tbody>{
						props.objectsTable.map((objInfo, i) => {
							const isAddedToCart = cart.hasItem(objInfo.dobj);

							return (
								<CompactSearchResultTableRow
									lookup={lookup}
									preview={preview}
									handlePreview={handlePreview}
									objInfo={objInfo}
									isAddedToCart={isAddedToCart}
									addToCart={props.addToCart}
									removeFromCart={props.removeFromCart}
									key={'dobj_' + i}
									handleViewMetadata={handleViewMetadata}
								/>
							);
						})
					}</tbody>
				</table>
			</div>
		</div>
	</div>;
};

const SortButton: React.FunctionComponent<{
	sorting: State['sorting'],
	varName: string,
	toggleSort: (varName: string) => void
}> = props => {
	const sorting = props.sorting || {};

	const glyphClass = 'glyphicon glyphicon-sort' + (
		(sorting.varName !== props.varName)
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

export default CompactSearchResultTable;
