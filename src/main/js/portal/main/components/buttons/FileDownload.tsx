import React, { CSSProperties } from 'react';
import config from '../../config';
import commonConfig from '../../../../common/main/config';
import { ExportQuery } from '../../models/State';

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
	const sparqlUrl = `${commonConfig.metaBaseUri}sparqlclient/`;

	const openSparqlQuery = () => {
		const form = document.getElementById("sparqlClientForm") as HTMLFormElement;
		form.submit();
	};

	if (isFetchingCVS)
		return (
			<span>
				<span style={{ ...iconStyle, ...{ color: 'gray' } }} className="glyphicon glyphicon-download-alt" title="Fetching CSV..." />
				<span style={iconStyle} onClick={openSparqlQuery} className="glyphicon glyphicon-share" title="Open SPARQL query" />
			</span>
		);

	else
		return (
			<span>
				<span style={iconStyle} onClick={getAllFilteredDataObjects} className="glyphicon glyphicon-download-alt" title={saveTitle} />
				<span style={iconStyle} onClick={openSparqlQuery} className="glyphicon glyphicon-share" title="Open SPARQL query for basic search result. See Advanced tab for more queries." />

				<form id="sparqlClientForm" method="POST" action={sparqlUrl} target="_blank" style={{display: 'none'}}>
					<input type="hidden" name="query" value={sparqClientQuery} />
				</form>
			</span>
		);
};
