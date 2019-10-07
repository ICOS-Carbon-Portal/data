import {SparqlResultBinding, SparqlResult, Query} from "./sparql";
import {sparql} from "icos-cp-backend";

export const sparqlFetch = <Mandatories extends string, Optionals extends string, Res extends Row<Mandatories, Optionals>>(
		query: Query<Mandatories, Optionals>,
		sparqlEndpoint: string,
		parser: (resp: SparqlResultBinding<Mandatories, Optionals>) => Res): Promise<Res[]> => {

	return sparql(query.text, sparqlEndpoint, true)
		.then((sparqlRes: SparqlResult<Mandatories, Optionals>) => {
				try {
					return sparqlRes.results.bindings.map(parser);
				} catch (err) {
					throw new Error("Failed to parse SPARQL response: " + (err.message || "???"));
				}
			}
		);
};

type Parsed = string | number | boolean;

type Row<Mandatories extends string, Optionals extends string> = {
	[v in Mandatories]: Parsed
} & {
	[v in Optionals]: Parsed | undefined
}
