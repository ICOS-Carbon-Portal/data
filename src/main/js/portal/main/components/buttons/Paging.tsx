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
}

export const Paging = (props: Paging) => {
	const { type, paging, requestStep, searchOptions, getAllFilteredDataObjects, exportQuery, paneSource } = props;

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
}

// Shows a spinner next to the count-query number while the actual received count is being
// fetched automatically. Once known, the count is shown in parentheses by CountHeader.
const FullCountControl = ({receivedCount, isFetching}: FullCountControl) => {
	if (receivedCount !== undefined || !isFetching) return null;

	return (
		<span className="ms-2 text-muted small align-middle">
			<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
			counting…
		</span>
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

	if (isNaN(to) || isNaN(objCount)) return <span>&nbsp;</span>;

	// Colour the actual received count softly green when it matches the count-query
	// number, softly red when it doesn't, so a discrepancy is easy to spot.
	const received = receivedCount === undefined
		? null
		: <span style={{ color: receivedCount === objCount ? '#5a9e6a' : '#cf7b7b' }}>
			{` (${receivedCount.toLocaleString()})`}
		</span>;

	return (
		<span>
			{`Data objects ${objCount === 0 ? 0 : offset + 1} to ${to} of ${objCount.toLocaleString()}`}
			{received}
			{deprecatedTxt}
		</span>
	);
};
