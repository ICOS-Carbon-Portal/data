import React, { CSSProperties } from 'react';
import config from '../../config';
import { ExportQuery } from '../../models/State';

interface Props {
	getAllFilteredDataObjects: () => void
	exportQuery: ExportQuery
}

const iconStyle: CSSProperties = {
	marginLeft: 10,
	cursor: 'pointer'
};
const saveTitle = `Export first ${config.exportCSVLimit.toLocaleString()} records to CSV`;

export const FileDownload = ({ getAllFilteredDataObjects, exportQuery }: Props) => {
	const { isFetchingCVS, sparqClientQuery } = exportQuery;

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
				<span style={iconStyle} onClick={openSparqlQuery} className="glyphicon glyphicon-share" title="Open SPARQL query" />

				<form id="sparqlClientForm" method="POST" action="https://meta.icos-cp.eu/sparqlclient/" target="_blank" style={{display: 'none'}}>
					<input type="hidden" name="query" value={sparqClientQuery} />
				</form>
			</span>
		);
};
