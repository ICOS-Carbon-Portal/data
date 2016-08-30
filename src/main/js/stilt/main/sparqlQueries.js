/*

import config from './config';

var {wdcggBaseUri, cpmetaOntoUri} = config;

export function stationPositions(){
	return `prefix cpmeta: <${cpmetaOntoUri}>
select *
from <${wdcggBaseUri}>
where{
	?station a cpmeta:Station .
	?station cpmeta:hasName ?name .
	?station cpmeta:hasLatitude ?lat .
	?station cpmeta:hasLongitude ?lon .
}`;
}

*/
