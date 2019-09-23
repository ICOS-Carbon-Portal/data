export interface SparqlResult<Varname extends string = string>{
	head: {
		vars: Varname[]
	}
	results: {
		bindings: [{
			[v in Varname]?: SparqlResultBinding
		}]
	}
}

export interface SparqlResultBinding{
	type: "uri" | "literal"
	value: string
	datatype?: string
}
