import React from 'react';
import {StepButton} from './StepButton';
import P from "../../models/Paging";
import config from "../../config";
import {ExportQuery, SearchOptions} from "../../models/State";
import { FileDownload } from './FileDownload';

function pagingCounts(paging: P) {
	const {offset, objCount, pageCount} = paging;
	const minObjs = Math.min(offset + pageCount, objCount);
	const to = minObjs < pageCount
		? pageCount
		: minObjs;
	const count = pageCount < config.stepsize ? to : objCount;

	return {offset, to, count, isForwardEnabled: to < count};
}

interface PagingCount {
	paging: P
	searchOptions: SearchOptions | undefined
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
}

export const PagingCount = (props: PagingCount) => {
	const { paging, searchOptions, getAllFilteredDataObjects, exportQuery } = props;

	const {offset, to, count} = pagingCounts(paging);
	const showDeprecated = searchOptions ? searchOptions.showDeprecated : false;

	return (
		<span className="paging-count py-1">
			<CountHeader objCount={count} to={to} offset={offset} showDeprecated={showDeprecated} />

			<FileDownload exportQuery={exportQuery} getAllFilteredDataObjects={getAllFilteredDataObjects} searchResultsCount={count} />
		</span>
	);
};

interface PagingSteps {
	paging: P
	onStep: (direction: -1 | 1) => void
}

export const PagingSteps = ({paging, onStep}: PagingSteps) => {
	const {offset, isForwardEnabled} = pagingCounts(paging);

	return (
		<>
			<StepButton direction="step-backward" enabled={offset > 0} onStep={() => onStep(-1)}/>
			<StepButton direction="step-forward" enabled={isForwardEnabled} onStep={() => onStep(1)}/>
		</>
	);
};

interface PagingFooter {
	paging: P
	requestStep: (direction: -1 | 1) => void
}

export const PagingFooter = ({paging, requestStep}: PagingFooter) => {
	const onStep = (direction: -1 | 1) => {
		window.scrollTo(0, 0);
		requestStep(direction);
	};

	return (
		<div className="card-footer">
			<div style={{textAlign: 'right', lineHeight: '1rem'}}>
				<PagingSteps paging={paging} onStep={onStep} />
			</div>
		</div>
	);
};

interface CountHeader {
	objCount: number
	to: number
	offset: number
	showDeprecated: boolean
}

const CountHeader = ({objCount, to, offset, showDeprecated}: CountHeader) => {
	const deprecatedTxt = showDeprecated
		? ' (including deprecated objects)'
		: '';
	const countTxt = !isNaN(to) && !isNaN(objCount)
		? `Data objects ${objCount === 0 ? 0 : offset + 1} to ${to} of ${objCount.toLocaleString()}${deprecatedTxt}`
		: <span>&nbsp;</span>;

	return <span>{countTxt}</span>;
};
