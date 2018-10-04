#!/usr/bin/env python3
# coding=utf-8

from Restheart import Restheart

op = 'label'
restheart = Restheart()

UPDATE_PORTALUSE = True
pagesize = 700
updated_count = 0

lookup = {
	'theme': {
		'Atmospheric data': 'http://meta.icos-cp.eu/resources/themes/atmosphere',
		'Ecosystem data': 'http://meta.icos-cp.eu/resources/themes/ecosystem',
		'Ocean data': 'http://meta.icos-cp.eu/resources/themes/ocean',
		'Mixed-theme data': 'http://meta.icos-cp.eu/resources/themes/other',
	},
	'station': {
		'Křešín u Pacova': 'http://meta.icos-cp.eu/resources/stations/AS_KRE',
		'Gartow': 'http://meta.icos-cp.eu/resources/stations/AS_GAT'
	},
	'submitter': {
		'Atmosphere thematic center': 'http://meta.icos-cp.eu/resources/organizations/ATC'
	}
}


def update_portaluse_records():
	counter = 0

	for record in records:
		id = record['_id']['$oid']
		current_type = None
		log_entry = None

		if 'filterChange' in record:
			current_type = 'filterChange'
			log_entry = record[current_type]['filters']

		elif 'previewNetCDF' in record:
			current_type = 'previewNetCDF'
			log_entry = record[current_type]['params']

		elif 'previewTimeserie' in record:
			current_type = 'previewTimeserie'
			log_entry = record[current_type]['params']

		else: print('Unknown type:', record)

		if current_type is not None and log_entry is not None:
			lookup_label(log_entry)
			counter = counter + 1
			print(id, current_type, log_entry)

	return counter


def lookup_label(record):
	for key in record:
		if isinstance(record[key], dict):
			lookup_label(record[key])

		elif isinstance(record[key], list):
			for i in range(len(record[key])):
				val = record[key][i]

				if key in lookup and val in lookup[key]:
					record[key][i] = lookup[key][val]

		else:
			val = record[key]

			if key in lookup and val in lookup[key]:
				record[key] = lookup[key][val]




while UPDATE_PORTALUSE:
	print("Fetching " + str(pagesize) + " records")
	records = restheart.get_records_to_update(op, pagesize, 'portaluse')

	if records is None:
		print("No records found -> Exiting")
		break
	else:
		counted_updates = update_portaluse_records()
		updated_count = updated_count + counted_updates

	if len(records) < pagesize:
		break

	UPDATE_PORTALUSE = False
