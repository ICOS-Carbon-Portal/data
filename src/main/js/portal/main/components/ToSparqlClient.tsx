import React, { FunctionComponent } from "react";
import { PublicQueryDeclaration, QueryName } from "../config";
import commonConfig from '../../../common/main/config';

export const sparqlUrl = `${commonConfig.metaBaseUri}/sparqlclient/`;

// The secondary (dual-view) meta backend's SPARQL client, derived from its /sparql endpoint.
// null when the dual-view feature is disabled.
export const secondarySparqlUrl = commonConfig.secondarySparqlEndpoint
	? commonConfig.secondarySparqlEndpoint.replace(/\/sparql\/?$/, '/sparqlclient/')
	: null;

interface Props extends PublicQueryDeclaration {
	queryName: QueryName
	getPublicQuery: (queryName: QueryName) => string
}

export const ToSparqlClient: FunctionComponent<Props> = (props) => {
	const postToSparql = () => {
		const form = document.getElementById(formId) as HTMLFormElement;
		const input = document.getElementById(queryId) as HTMLInputElement;
		input.value = getPublicQuery(queryName);

		form.submit();
	};

	const { comment, label, queryName, getPublicQuery } = props;
	const formId = `form_toSparql_${queryName.replaceAll(" ", "")}`;
	const queryId = `query_toSparql_${queryName.replaceAll(" ", "")}`;

	return (
		<>
			<button
				className="btn btn-link p-0 text-start"
				onClick={postToSparql}
				title={comment}
			><i className="fas fa-share-square"></i> {label}</button>

			<form id={formId} method="POST" action={sparqlUrl} target="_blank" style={{ display: 'none' }}>
				<input type="hidden" id={queryId} name="query" />
			</form>
		</>
	);
};
