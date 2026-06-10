import { SparqlResultValue, SparqlResultLiteralValue, Query } from 'icos-cp-backend'
import {UrlStr} from './declarations'
import { liftToOptional, OptFunction } from '../utils'

function resultIsLiteralValue(v: SparqlResultValue): v is SparqlResultLiteralValue {
	return v.type === 'literal'
}

type LiteralDatatype = SparqlResultLiteralValue['datatype']


function makeParser<T>(dt: LiteralDatatype | undefined, parser: (vs: string) => T): OptFunction<SparqlResultValue, T> {
	return liftToOptional((v: SparqlResultValue) => {
		if(!resultIsLiteralValue(v)) throw new Error(`SPARQL result parsing error, ${v} was not literal`)
		if(dt !== undefined && v.datatype !== dt) throw new Error(`SPARQL result parsing error, expected ${v.value} to be ${dt} but it was ${v.datatype}`)
		else return parser(v.value)
	})
}

function fromUrl(v: SparqlResultValue): UrlStr {
	if(v.type !== 'uri') throw new Error(`SPARQL result parsing error, ${v} was not URI resource`)
	return v.value
}

function fromBoolean(v: SparqlResultValue): boolean {
	if(!resultIsLiteralValue(v)) throw new Error(`SPARQL result parsing error, ${v} was not literal`)
	// The standard backend serializes xsd:boolean results as "true"/"false", whereas Virtuoso
	// serializes boolean-valued expressions (e.g. EXISTS bindings) as xsd:integer "1"/"0". Accept both.
	switch(v.value.toLowerCase()){
		case "true":
		case "1":
			return true
		case "false":
		case "0":
			return false
		default:
			throw new Error(`SPARQL result parsing error, expected ${v.value} to be a boolean`)
	}
}

export const sparqlParsers = {
	fromInt: makeParser("http://www.w3.org/2001/XMLSchema#integer", parseInt),
	fromLong: makeParser("http://www.w3.org/2001/XMLSchema#long", parseInt),
	fromFloat: makeParser("http://www.w3.org/2001/XMLSchema#float", parseFloat),
	fromDouble: makeParser("http://www.w3.org/2001/XMLSchema#double", parseFloat),
	fromDateTime: makeParser("http://www.w3.org/2001/XMLSchema#dateTime", s => new Date(s)),
	fromBoolean: liftToOptional(fromBoolean),
	fromString: makeParser(undefined, s => s),
	fromCommaSepListString: makeParser(undefined, s => s.split(',').map(s => s.trim())),
	fromUrl: liftToOptional(fromUrl)
}

export type QueryResultColumns<T> = T extends Query<infer Mandatories, infer Optionals> ? Mandatories | Optionals : never
