#!/bin/bash
# takes sparql query file name (to be found in same dir, extension "rq"), produces the list of dobjs with the same name (extension "txt")
curl -X POST -H "Accept: text/csv" --data-binary @$1.rq https://meta.icos-cp.eu/sparql | dos2unix | tail -n +2 > $1.txt