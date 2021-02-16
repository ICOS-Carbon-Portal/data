import React, { FunctionComponent } from "react";
import { PublicQueryDeclaration, QueryName } from "../config";
import commonConfig from '../../../common/main/config';

const sparqlUrl = `${commonConfig.metaBaseUri}sparqlclient/`;

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

	const { info, label, queryName, getPublicQuery } = props;
	const formId = `form_toSparql_${queryName.replaceAll(" ", "")}`;
	const queryId = `query_toSparql_${queryName.replaceAll(" ", "")}`;

	return (
		<>
			<span style={{ cursor: 'pointer', color: '#0a96f0' }} onClick={postToSparql} title={info}>{label}</span>

			<form id={formId} method="POST" action={sparqlUrl} target="_blank" style={{ display: 'none' }}>
				<input type="hidden" id={queryId} name="query" />
			</form>
		</>
	);
};