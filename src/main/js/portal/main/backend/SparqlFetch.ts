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
				throw new Error("Failed to parse SPARQL response: " + (err.message || "unspecified error"));
			}
		});
};

type Parsed = string | string[] | number | boolean | Date;

type Row<Mandatories extends string, Optionals extends string> = {
	[v in Mandatories]: Parsed
} & {
	[v in Optionals]: Parsed | undefined
}
