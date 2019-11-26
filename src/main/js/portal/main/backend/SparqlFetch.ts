import {sparql, SparqlResultBinding, SparqlResult, Query} from 'icos-cp-backend';

export const sparqlFetch = <Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
		query: Query<Mandatories, Optionals>,
		sparqlEndpoint: string,
		parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res): Promise<Res[]> => {

	return sparql(query, sparqlEndpoint, true)
		.then((sparqlRes: SparqlResult<Mandatories, Optionals>) => {
				try {
					return sparqlRes.results.bindings.map(parser);
				} catch (err) {
					throw new Error("Failed to parse SPARQL response: " + (err.message || "???"));
				}
			}
		);
};

export const sparqlFetchAndParse = <Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
	query: Query<Mandatories, Optionals>,
	sparqlEndpoint: string,
	parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res): Promise<{columnNames: string[], rows: Res[]}> => {

	return sparql(query, sparqlEndpoint, true)
		.then((sparqlRes: SparqlResult<Mandatories, Optionals>) => {
				try {
					return {
						columnNames: sparqlRes.head.vars,
						rows: sparqlRes.results.bindings.map(parser)
					};

				} catch (err) {
					throw new Error("Failed to parse SPARQL response: " + (err.message || "???"));
				}
			}
		);
};

type Parsed = string | number | boolean | Date;

type Row<Mandatories extends string, Optionals extends string> = {
	[v in Mandatories]: Parsed
} & {
	[v in Optionals]: Parsed | undefined
}
