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

export namespace XMLSchema {
	/** Used for bindings that lacks datatype	*/
	export type String = string;
	export type Integer = number;
	export type Float = number;
	export type DateTime = Date;
	export type Boolean = boolean;
}

export interface SparqlResultValue{
	type: "uri" | "literal"
	value: string
	datatype?: 'http://www.w3.org/2001/XMLSchema#integer'
		| 'http://www.w3.org/2001/XMLSchema#long'
		| 'http://www.w3.org/2001/XMLSchema#float'
		| 'http://www.w3.org/2001/XMLSchema#double'
		| 'http://www.w3.org/2001/XMLSchema#dateTime'
		| 'http://www.w3.org/2001/XMLSchema#boolean'
}

export interface Query<Mandatories extends string, Optionals extends string>{
	text: string;
}
