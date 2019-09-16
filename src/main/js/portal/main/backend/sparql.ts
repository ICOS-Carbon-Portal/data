interface ISparqlResult<Varname extends string>{
	head: {
		vars: Varname[]
	}
	results: {
		bindings: {
			[v in Varname]?: {
				type: "uri" | "literal"
				value: string
				datatype?: string
			}
		}
	}
}
