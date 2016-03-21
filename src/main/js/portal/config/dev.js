import common from './common'

let config = Object.assign({}, common, {
	sparqlEndpoint: 'http://127.0.0.1:9094/sparql'
});

window.cpConfig = config;