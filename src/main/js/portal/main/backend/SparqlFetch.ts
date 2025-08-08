import {
	sparql, type SparqlResultBinding, type SparqlResult, type Query
} from "icos-cp-backend";

export async function sparqlFetchAndParse<Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
	query: Query<Mandatories, Optionals>,
	sparqlEndpoint: string,
	parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res
): Promise<{colNames: Array<Mandatories | Optionals>, rows: Res[]}> {
	return sparql(query, sparqlEndpoint, true)
		.then((sparqlRes: SparqlResult<Mandatories, Optionals>) => {
			try {
				return {
					colNames: sparqlRes.head.vars,
					rows: sparqlRes.results.bindings.map(parser)
				};
			} catch (error) {
				const message = (error instanceof Error) ? error.message : "unspecified error";
				throw new Error("Failed to parse SPARQL response: " + message);
			}
		});
}

export type SparqlResponseType = "JSON" | "CSV" | "XML" | "TSV or Turtle";

export async function sparqlFetch(queryTxt: string, sparqlEndpoint: string, sparqlResponseType: SparqlResponseType, acceptCachedResults?: boolean): Promise<Response> {
	const getType = (): string => {
		switch (sparqlResponseType) {
			case "JSON": {return "application/json";
			}

			case "CSV": {return "text/csv";
			}

			case "XML": {return "application/xml";
			}

			case "TSV or Turtle": {return "text/plain";
			}
		}
	};

	const cacheHeader: HeadersInit = acceptCachedResults
		? {} // Expecting default cache behaviour from the server
		: {"Cache-Control": "no-cache"};
	const headers: HeadersInit = {
		Accept: getType(),
		"Content-Type": "text/plain"
	};

	return fetch(sparqlEndpoint, {
		method: "post",
		headers: new Headers({...cacheHeader, ...headers}),
		body: queryTxt
	})
		.then(async resp => {
			if (resp.ok) {
				return resp;
			}

			return resp.text().then(async txt => {
				throw new Error(txt || resp.statusText || "Ajax response status: " + resp.status);
			});
		});
}

type Parsed = string | string[] | number | boolean | Date;

type Row<Mandatories extends string, Optionals extends string> = Record<Mandatories, Parsed> & Record<Optionals, Parsed | undefined>;
