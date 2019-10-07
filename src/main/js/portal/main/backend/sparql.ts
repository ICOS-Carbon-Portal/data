export interface SparqlResult<Mandatories extends string, Optionals extends string>{
	head: {
		vars: Array<Mandatories | Optionals>
	}
	results: {
		bindings: [SparqlResultBinding<Mandatories, Optionals>]
	}
}

export type SparqlResultBinding<Mandatories extends string, Optionals extends string> = {
	[v in Mandatories]: SparqlResultValue
} & {
	[v in Optionals]?: SparqlResultValue
}

export interface SparqlResultValue{
	type: "uri" | "literal"
	value: string
	datatype?: string
}

export interface Query<Mandatories extends string, Optionals extends string>{
	text: string;
}
