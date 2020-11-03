import React from 'react';
import {StepButton} from './StepButton';
import P from "../../models/Paging";
import config from "../../config";
import {ExportQuery, SearchOptions} from "../../models/State";
import { FileDownload } from './FileDownload';

interface Paging {
	type: 'header' | 'footer'
	paging: P
	requestStep: (direction: -1 | 1) => void | undefined
	searchOptions: SearchOptions | undefined
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
}

export const Paging = (props: Paging) => {
	const { type, paging, requestStep, searchOptions, getAllFilteredDataObjects, exportQuery } = props;
	

	const {offset, objCount, pageCount} = paging;
	const minObjs = Math.min(offset + pageCount, objCount);
	const to = minObjs < pageCount
		? pageCount
		: minObjs;
	const count = pageCount < config.stepsize ? to : objCount;
	const isForwardEnabled = to < count;
	const showDeprecated = searchOptions ? searchOptions.showDeprecated : false;

	if (type === "header") {
		return (
			<div className="panel-heading">
				<CountHeader objCount={count} to={to} offset={offset} showDeprecated={showDeprecated} />

				<FileDownload exportQuery={exportQuery} getAllFilteredDataObjects={getAllFilteredDataObjects} searchResultsCount={count} />

				<div style={{display: 'inline', float: 'right', position: 'relative', top: -3}}>
					<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)}/>
					<StepButton direction="forward" enabled={isForwardEnabled} onStep={() => requestStep(1)}/>
				</div>
			</div>
		);
	} else if (type === "footer") {
		return (
			<div className="panel-footer">
				<div style={{textAlign: 'right', lineHeight: '1rem'}}>
					<StepButton direction="backward" enabled={offset > 0} onStep={() => {window.scrollTo(0, 0);requestStep(-1)}} />
					<StepButton direction="forward" enabled={isForwardEnabled} onStep={() => {window.scrollTo(0, 0);requestStep(1)}} />
				</div>
			</div>
		);
	} else {
		return null;
	}
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

	return <h3 className="panel-title" style={{display:'inline'}}>{countTxt}</h3>;
};
