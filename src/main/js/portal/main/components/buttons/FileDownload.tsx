import React, { CSSProperties } from 'react';
import config from '../../config';
import { ExportQuery } from '../../models/State';
import { sparqlUrl, secondarySparqlUrl } from '../ToSparqlClient';
import type { PaneSource } from '../../containers/search/SearchResultRegular';

interface Props {
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
	searchResultsCount: number
	paneSource?: PaneSource
}

const iconStyle: CSSProperties = {
	marginLeft: 10,
	cursor: 'pointer'
};

export const FileDownload = ({ getAllFilteredDataObjects, exportQuery, searchResultsCount, paneSource }: Props) => {
	const { isFetchingCVS, sparqClientQuery } = exportQuery;
	const downloadCount = searchResultsCount > config.exportCSVLimit ? `first ${config.exportCSVLimit.toLocaleString()}` : searchResultsCount.toLocaleString();
	const saveTitle = `Export ${downloadCount} records to CSV`;

	// Each pane posts its own query to its own meta backend; unique form ids keep the two panes'
	// hidden forms from colliding (getElementById would otherwise always return the first pane's form).
	const isSecondary = paneSource === 'secondary';
	const formId = isSecondary ? "sparqlClientForm_secondary" : "sparqlClientForm";
	const actionUrl = isSecondary ? (secondarySparqlUrl ?? sparqlUrl) : sparqlUrl;

	const openSparqlQuery = () => {
		const form = document.getElementById(formId) as HTMLFormElement;
		form.submit();
	};

	if (isFetchingCVS)
		return (
			<span>
				<span style={{ ...iconStyle, ...{ color: 'gray' } }} className="fas fa-download" title="Fetching CSV..." />
				<span style={iconStyle} onClick={openSparqlQuery} className="fas fa-share-square" title="Open SPARQL query" />
			</span>
		);

	else
		return (
			<span>
				<span style={iconStyle} onClick={getAllFilteredDataObjects} className="fas fa-download" title={saveTitle} />
				<span style={iconStyle} onClick={openSparqlQuery} className="fas fa-share-square" title="Open SPARQL query for basic search result. See Advanced tab for more queries." />

				<form id={formId} method="POST" action={actionUrl} target="_blank" style={{display: 'none'}}>
					<input type="hidden" name="query" value={sparqClientQuery} />
				</form>
			</span>
		);
};
