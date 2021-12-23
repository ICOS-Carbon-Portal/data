import {sparql, SparqlResultBinding, SparqlResult, Query} from 'icos-cp-backend';

export function sparqlFetchAndParse<Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
	query: Query<Mandatories, Optionals>,
	sparqlEndpoint: string,
	parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res
): Promise<{colNames: (Mandatories | Optionals)[], rows: Res[]}> {

	return sparql(query, sparqlEndpoint, true)
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
	const getType = (): string => {
		switch (sparqlResponseType) {
			case 'JSON': return 'application/json';
			case 'CSV': return 'text/csv';
			case 'XML': return 'application/xml';
			case 'TSV or Turtle': return 'text/plain';
		}
	};

	const cacheHeader: HeadersInit = acceptCachedResults
		? { 'Cache-Control': 'max-age=1000000' } //server decides how old the cache can get
		: {}; //expecting no-cache default behaviour from the server
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
