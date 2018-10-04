#!/usr/bin/env python3

from Restheart import Restheart
from GeoIP import GeoIP
import os

op = 'geo'
restheart = Restheart()
geoIp = GeoIP()

UPDATE_PORTALUSE = False
UPDATE_DOWNLOADS = False

pagesize = 1000
updated_count = 0

bad_records = set()
try:
	os.remove('badRecords.txt')
except OSError:
	pass


def log_bad_records(collection):
	bad_records_file = open('badRecords.txt', 'a')

	for id in bad_records:
		bad_records_file.write(id + ',' + collection + '\n')

	bad_records_file.close()

def update_portaluse_records(records):
	counter = 0

	for record in records:
		id = record['_id']['$oid']
		current_type = None
		ip = None

		if 'filterChange' in record: current_type = 'filterChange'
		elif 'previewNetCDF' in record: current_type = 'previewNetCDF'
		elif 'previewTimeserie' in record: current_type = 'previewTimeserie'

		if current_type is not None and ('ip' in record or 'ip' in record[current_type]):
			ip = record['ip'] if 'ip' in record else record[current_type]['ip']

			if ip == '127.0.0.1':
				print("Skipping record", record)
				bad_records.add(id)
				continue
			else:
				position = geoIp.get_position(ip)

				if 'latitude' and 'longitude' in position:
					if 'ip' in record[current_type]: del record[current_type]['ip']
					del record['_etag']
					del record['_id']

					record['ip'] = ip
					record['latitude'] = position['latitude']
					record['longitude'] = position['longitude']
					record['country_code'] = position['country_code']
					record['city'] = position['city']

					restheart.update_record(id, record, 'portaluse')
					counter = counter + 1
		else:
			bad_records.add(id)
			print("Could not update", record)

	return counter


def update_download_records(records):
	counter = 0

	for record in records:
		id = record['_id']['$oid']
		ip = record['ip']

		if ip == '127.0.0.1':
			print("Skipping record", record)
			bad_records.add(id)
			continue
		else:
			position = geoIp.get_position(ip)

			if 'latitude' and 'longitude' in position:
				new_record = {
					'latitude': position['latitude'],
					'longitude': position['longitude'],
					'country_code': position['country_code'],
					'city': position['city']
				}

				restheart.update_record(id, new_record, 'dobjdls')
				counter = counter + 1
			else:
				bad_records.add(id)
				print("Could not update", record)

	return counter


while UPDATE_PORTALUSE:
	print("Fetching " + str(pagesize) + " records")
	records = restheart.get_records_to_update(op, pagesize, 'portaluse')

	if records is None:
		print("No records found -> Exiting")
		break
	else:
		counted_updates = update_portaluse_records(records)
		updated_count = updated_count + counted_updates

	if len(records) < pagesize:
		break

if UPDATE_PORTALUSE:
	print("Updated records for portaluse:", updated_count)
	updated_count = 0
	log_bad_records('portaluse')
	bad_records = set()


while UPDATE_DOWNLOADS:
	print("Fetching " + str(pagesize) + " records")
	records = restheart.get_records_to_update(op, pagesize, 'dobjdls')

	if records is None:
		print("No records found -> Exiting")
		break
	else:
		counted_updates = update_download_records(records)
		updated_count = updated_count + counted_updates

	if len(records) < pagesize:
		break

if UPDATE_DOWNLOADS:
	print("Updated records for downloads:", updated_count)
	log_bad_records('dobjdls')
