#!/usr/bin/env python3

from subprocess import call
import os


baseUrl = 'http://127.0.0.1:8088/db/'	# localhost
# baseUrl = 'http://127.0.0.1:8888/db/'	# production

with open('badRecords.txt') as f:
	records_to_delete = f.readlines()

for row in records_to_delete:
	items = row.split(',')
	id = items[0]
	collection = items[1].strip()
	url = baseUrl + collection + '/' + id

	os.system('curl -X DELETE ' + url)
