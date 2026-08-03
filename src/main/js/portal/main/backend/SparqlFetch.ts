import {sparql as executeSparql, SparqlResultBinding, SparqlResult, Query} from 'icos-cp-backend';

function logSparqlQuery(queryTxt: string, sparqlEndpoint: string): void {
	const trimmedQuery = queryTxt.trim();
	const queryName = trimmedQuery.match(/^#\s*([^\r\n]+)/)?.[1];
	const label = queryName ? `SPARQL: ${queryName}` : 'SPARQL query';

	console.groupCollapsed(`%c${label}`, 'color: #087f5b; font-weight: bold');
	console.log(trimmedQuery);
	console.log('Endpoint:', sparqlEndpoint);
	console.groupEnd();
}

export function sparqlQuery<Mandatories extends string, Optionals extends string>(
	query: Query<Mandatories, Optionals>,
	sparqlEndpoint: string,
	acceptCachedResults: boolean
): Promise<SparqlResult<Mandatories, Optionals>> {
	logSparqlQuery(query.text, sparqlEndpoint);
	return executeSparql(query, sparqlEndpoint, acceptCachedResults);
}

export function sparqlFetchAndParse<Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
	query: Query<Mandatories, Optionals>,
	sparqlEndpoint: string,
	parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res
): Promise<{colNames: (Mandatories | Optionals)[], rows: Res[]}> {

	return sparqlQuery(query, sparqlEndpoint, true)
		.then((sparqlRes: SparqlResult<Mandatories, Optionals>) => {
			try {
				return {
					colNames: sparqlRes.head.vars,
					rows: sparqlRes.results.bindings.map(parser)
				};

			} catch (err) {
				let message = (err instanceof Error) ? err.message : 'unspecified error';
				throw new Error("Failed to parse SPARQL response: " + message);
			}
		});
};

export type SparqlResponseType = 'JSON' | 'CSV' | 'XML' | 'TSV or Turtle'

export function sparqlFetch(queryTxt: string, sparqlEndpoint: string, sparqlResponseType: SparqlResponseType, acceptCachedResults?: boolean): Promise<Response> {
	logSparqlQuery(queryTxt, sparqlEndpoint);

	const getType = (): string => {
		switch (sparqlResponseType) {
			case 'JSON': return 'application/json';
			case 'CSV': return 'text/csv';
			case 'XML': return 'application/xml';
			case 'TSV or Turtle': return 'text/plain';
		}
	};

	const cacheHeader: HeadersInit = acceptCachedResults
		? {} //expecting default cache behaviour from the server
		: { 'Cache-Control': 'no-cache'};
	const headers: HeadersInit = {
		'Accept': getType(),
		'Content-Type': 'text/plain'
	};

	return fetch(sparqlEndpoint, {
		method: 'post',
		headers: new Headers({ ...cacheHeader, ...headers }),
		body: queryTxt
	})
		.then(resp => {
			if (resp.ok) {
				return resp;
			} else {
				return resp.text().then(txt =>
					Promise.reject(new Error(txt || resp.statusText || "Ajax response status: " + resp.status))
				);
			}
		});
}

type Parsed = string | string[] | number | boolean | Date;

type Row<Mandatories extends string, Optionals extends string> = {
	[v in Mandatories]: Parsed
} & {
	[v in Optionals]: Parsed | undefined
}
