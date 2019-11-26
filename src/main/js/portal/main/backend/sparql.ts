import { SparqlResultValue, SparqlResultLiteralValue } from 'icos-cp-backend'
import {UrlStr} from './declarations'

function resultIsLiteralValue(v: SparqlResultValue): v is SparqlResultLiteralValue {
	return v.type === 'literal'
}

type LiteralDatatype = SparqlResultLiteralValue['datatype']

function makeParser<T>(dt: LiteralDatatype | undefined, parser: (vs: string) => T): (v: SparqlResultValue) => T {
	return v => {
		if(!resultIsLiteralValue(v)) throw new Error(`SPARQL result parsing error, ${v} was not literal`)
		if(dt !== undefined && v.datatype !== dt) throw new Error(`SPARQL result parsing error, expected ${v.value} to be ${dt} but it was ${v.datatype}`)
		return parser(v.value)
	}
}

function fromUrl(v: SparqlResultValue): UrlStr {
	if(v.type !== 'uri') throw new Error(`SPARQL result parsing error, ${v} was not URI resource`)
	return v.value
}

export const sparqlParsers = {
	fromInt: makeParser("http://www.w3.org/2001/XMLSchema#integer", parseInt),
	fromLong: makeParser("http://www.w3.org/2001/XMLSchema#long", parseInt),
	fromFloat: makeParser("http://www.w3.org/2001/XMLSchema#float", parseFloat),
	fromDouble: makeParser("http://www.w3.org/2001/XMLSchema#double", parseFloat),
	fromDateTime: makeParser("http://www.w3.org/2001/XMLSchema#dateTime", s => new Date(s)),
	fromBoolean: makeParser("http://www.w3.org/2001/XMLSchema#boolean", s => (s.toLowerCase() === "true")),
	fromString: makeParser(undefined, s => s),
	fromUrl
}
