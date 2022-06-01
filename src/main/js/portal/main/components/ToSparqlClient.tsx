import React, { FunctionComponent } from "react";
import { PublicQueryDeclaration, QueryName } from "../config";
import commonConfig from '../../../common/main/config';

export const sparqlUrl = `${commonConfig.metaBaseUri}sparqlclient/`;

interface Props extends PublicQueryDeclaration {
	queryName: QueryName
	getPublicQuery: (queryName: QueryName) => string
}

const defaultColor = "#0a96f0";
const hoverColor = "#0769a8";

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
			<span
				style={{ cursor: 'pointer', color: defaultColor }}
				onClick={postToSparql}
				title={comment}
				onMouseOver={handleMouseOver}
				onMouseOut={handleMouseOut}
			>{label}</span>

			<form id={formId} method="POST" action={sparqlUrl} target="_blank" style={{ display: 'none' }}>
				<input type="hidden" id={queryId} name="query" />
			</form>
		</>
	);
};

const handleMouseOver = (event: React.MouseEvent<HTMLSpanElement>) => {
	const span = event.target as HTMLSpanElement;
	span.style.textDecoration = "underline";
	span.style.color = hoverColor;
};

const handleMouseOut = (event: React.MouseEvent<HTMLSpanElement>) => {
	const span = event.target as HTMLSpanElement;
	span.style.textDecoration = "none";
	span.style.color = defaultColor;
};
