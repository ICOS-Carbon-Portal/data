import React, {type FunctionComponent} from "react";
import {type PublicQueryDeclaration, type QueryName} from "../config";
import commonConfig from "../../../common/main/config";

export const sparqlUrl = `${commonConfig.metaBaseUri}/sparqlclient/`;

type Props = {
	queryName: QueryName
	getPublicQuery: (queryName: QueryName) => string
} & PublicQueryDeclaration;

export const ToSparqlClient: FunctionComponent<Props> = props => {
	const postToSparql = () => {
		const form = document.getElementById(formId) as HTMLFormElement;
		const input = document.getElementById(queryId) as HTMLInputElement;
		input.value = getPublicQuery(queryName);

		form.submit();
	};

	const {comment, label, queryName, getPublicQuery} = props;
	const formId = `form_toSparql_${queryName.replaceAll(" ", "")}`;
	const queryId = `query_toSparql_${queryName.replaceAll(" ", "")}`;

	return (
		<>
			<button
				className="btn btn-link p-0 text-start"
				onClick={postToSparql}
				title={comment}
			><i className="fas fa-share-square"></i> {label}</button>

			<form id={formId} method="POST" action={sparqlUrl} target="_blank" style={{display: "none"}}>
				<input type="hidden" id={queryId} name="query" />
			</form>
		</>
	);
};
