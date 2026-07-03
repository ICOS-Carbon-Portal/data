import React from 'react';
import {StepButton} from './StepButton';
import P from "../../models/Paging";
import config from "../../config";
import {ExportQuery, SearchOptions} from "../../models/State";
import { FileDownload } from './FileDownload';
import type { PaneSource } from '../../containers/search/SearchResultRegular';

interface Paging {
	type: 'header' | 'footer'
	paging: P
	requestStep: (direction: -1 | 1) => void | undefined
	searchOptions: SearchOptions | undefined
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
	paneSource?: PaneSource
	getFullCount?: () => void
}

export const Paging = (props: Paging) => {
	const { type, paging, requestStep, searchOptions, getAllFilteredDataObjects, exportQuery, paneSource, getFullCount } = props;

	const {offset, objCount, pageCount, receivedCount, receivedCountFetching} = paging;
	const minObjs = Math.min(offset + pageCount, objCount);
	const to = minObjs < pageCount
		? pageCount
		: minObjs;
	const count = pageCount < config.stepsize ? to : objCount;
	const isForwardEnabled = to < count;
	const showDeprecated = searchOptions ? searchOptions.showDeprecated : false;

	if (type === "header") {
		return (
			<div className="card-header bg-transparent">
				<span className="align-middle">
					<CountHeader objCount={count} to={to} offset={offset} showDeprecated={showDeprecated}
						receivedCount={receivedCount} />

					<FullCountControl
						receivedCount={receivedCount}
						isFetching={receivedCountFetching}
						objCount={objCount}
						getFullCount={getFullCount}
					/>

					<FileDownload exportQuery={exportQuery} getAllFilteredDataObjects={getAllFilteredDataObjects} searchResultsCount={count} paneSource={paneSource} />
				</span>
				<div className="float-end lh-sm">
					<StepButton direction="step-backward" enabled={offset > 0} onStep={() => requestStep(-1)}/>
					<StepButton direction="step-forward" enabled={isForwardEnabled} onStep={() => requestStep(1)}/>
				</div>
			</div>
		);
	} else if (type === "footer") {
		return (
			<div className="card-footer">
				<div style={{textAlign: 'right', lineHeight: '1rem'}}>
					<StepButton direction="step-backward" enabled={offset > 0} onStep={() => {window.scrollTo(0, 0);requestStep(-1)}} />
					<StepButton direction="step-forward" enabled={isForwardEnabled} onStep={() => {window.scrollTo(0, 0);requestStep(1)}} />
				</div>
			</div>
		);
	} else {
		return null;
	}
};

interface FullCountControl {
	receivedCount?: number
	isFetching: boolean
	objCount: number
	getFullCount?: () => void
}

// Renders next to the count-query number: a button to fetch the full result set, a
// spinner while it loads, or nothing once the actual received count is known (that
// count is then shown in parentheses by CountHeader).
const FullCountControl = ({receivedCount, isFetching, objCount, getFullCount}: FullCountControl) => {
	if (receivedCount !== undefined) return null;

	if (isFetching) {
		return (
			<span className="ms-2 text-muted small align-middle">
				<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
				counting…
			</span>
		);
	}

	if (!getFullCount || objCount === 0) return null;

	return (
		<button
			type="button"
			className="btn btn-link btn-sm p-0 ms-2 align-middle"
			onClick={getFullCount}
			title="Fetch the full result set and show the actual number of received results"
		>
			count received
		</button>
	);
};

interface CountHeader {
	objCount: number
	to: number
	offset: number
	showDeprecated: boolean
	// Actual number of results received once all are loaded; shown in parentheses
	// next to the count-query number to reveal any discrepancy. Undefined while loading.
	receivedCount?: number
}

const CountHeader = ({objCount, to, offset, showDeprecated, receivedCount}: CountHeader) => {
	const deprecatedTxt = showDeprecated
		? ' (including deprecated objects)'
		: '';
	const receivedTxt = receivedCount === undefined
		? ''
		: ` (${receivedCount.toLocaleString()})`;
	const countTxt = !isNaN(to) && !isNaN(objCount)
		? `Data objects ${objCount === 0 ? 0 : offset + 1} to ${to} of ${objCount.toLocaleString()}${receivedTxt}${deprecatedTxt}`
		: <span>&nbsp;</span>;

	return <span>{countTxt}</span>;
};
