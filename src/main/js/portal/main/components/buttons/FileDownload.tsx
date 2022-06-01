import React, { CSSProperties } from 'react';
import config from '../../config';
import { ExportQuery } from '../../models/State';
import { sparqlUrl } from '../ToSparqlClient';

interface Props {
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
	searchResultsCount: number
}

const iconStyle: CSSProperties = {
	marginLeft: 10,
	cursor: 'pointer'
};

export const FileDownload = ({ getAllFilteredDataObjects, exportQuery, searchResultsCount }: Props) => {
	const { isFetchingCVS, sparqClientQuery } = exportQuery;
	const downloadCount = searchResultsCount > config.exportCSVLimit ? `first ${config.exportCSVLimit.toLocaleString()}` : searchResultsCount.toLocaleString();
	const saveTitle = `Export ${downloadCount} records to CSV`;

	const openSparqlQuery = () => {
		const form = document.getElementById("sparqlClientForm") as HTMLFormElement;
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

				<form id="sparqlClientForm" method="POST" action={sparqlUrl} target="_blank" style={{display: 'none'}}>
					<input type="hidden" name="query" value={sparqClientQuery} />
				</form>
			</span>
		);
};
