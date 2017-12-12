#!/bin/bash

dummy='test1'

md5=`echo -n "$dummy" | md5sum | awk '{print $1}'`


uploadDummy(){
	url="https://FA-Lso:p4ssw0rd@data.icos-cp.eu/upload/etc/"$md5"/FA-Lso_EC_"$1$2"_L3_F1.csv"
	echo $url
	curl -X PUT --data "$dummy" "$url"
}


uploadDummy '20130201' '0030'

for hour in $(seq -f "%02g" 1 23); do
	for min in '00' '30'; do
		uploadDummy '20130201' "$hour$min"
	done
done

uploadDummy '20130202' '0000'

