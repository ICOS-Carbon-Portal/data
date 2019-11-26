#!/bin/bash

# ICOS Sweden filter:
#	--data-urlencode 'filter={"dobj.submission.submitter.self.uri": "http://meta.icos-cp.eu/resources/organizations/icosSweden"}' \

# Data L2 filter:
#	--data-urlencode 'filter={"dobj.specification.dataLevel": 2}' \

# Lund University downloads filter:
#	--data-urlencode 'filter={"ip": {"$regex": "^130\\.235.*"}}' \

function getDlStats {
	STATION_ID=$1
	YEAR=$2

	echo -n $STATION_ID $YEAR' '

	curl -s -G \
	--data-urlencode 'filter={"dobj.specificInfo.acquisition.station.id": "'$STATION_ID'"}' \
	--data-urlencode 'filter={"ip": {"$regex": "^130\\.235.*"}}' \
	--data-urlencode 'filter={"time": {"$regex": "^'$YEAR'.*"}}' \
	'https://restheart.icos-cp.eu/db/dobjdls?np&count&hal=f&pagesize=1' \
	| jq -r '._size'
}

# for STATION_ID in HTM NOR SVB 'SE-Deg' 'SE-Htm' 'SE-Lnn' 'SE-Nor' 'SE-Sto' 'SE-Svb' 'SE-Oes'; do
# 	for YEAR in 2017 2018 2019; do
# 	sleep 0
# 		getDlStats $STATION_ID $YEAR
# 	done
# done

function saveGeoStats {
	FILENAME=$1

	curl -s -G \
	--data-urlencode 'keys={"country_code": 1, "_id": 0}' \
	--data-urlencode 'filter={"dobj.specificInfo.acquisition.station.id": {"$in": ["HTM", "NOR", "SVB", "SE-Deg", "SE_Htm", "SE-Lnn", "SE-Nor", "SE-Sto", "SE-Oes"]}}' \
	'https://restheart.icos-cp.eu/db/dobjdls?np&pagesize=1000000' > $FILENAME

	cat $FILENAME | jq -r '.[] | [.country_code] | @tsv' | sort | uniq -c
}

saveGeoStats geoStats.json