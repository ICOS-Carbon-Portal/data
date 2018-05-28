#!/usr/bin/env python3

from Restheart import Restheart
from GeoIP import GeoIP

restheart = Restheart()
geoIp = GeoIP()

UPDATE_PORTALUSE = False
UPDATE_DOWNLOADS = False

pagesize = 1000
updated_count = 0


def update_portaluse_records(records):
	counter = 0

	for record in records:
		id = record['_id']['$oid']
		current_type = None
		ip = None

		if 'filterChange' in record: current_type = 'filterChange'
		elif 'previewNetCDF' in record: current_type = 'previewNetCDF'
		elif 'previewTimeserie' in record: current_type = 'previewTimeserie'

		if current_type is not None and 'ip' in record[current_type]:
			ip = record[current_type]['ip']

			if ip == '127.0.0.1':
				continue
			else:
				position = geoIp.get_position(ip)

				if 'latitude' and 'longitude' in position:
					del record[current_type]['ip']
					del record['_etag']
					del record['_id']

					record['ip'] = ip
					record['latitude'] = position['latitude']
					record['longitude'] = position['longitude']

					restheart.update_record(id, record, 'portaluse')
					counter = counter + 1
		else:
			print("Could not update", record)

	return counter


def update_download_records(records):
	counter = 0

	for record in records:
		id = record['_id']['$oid']
		ip = record['ip']

		if ip == '127.0.0.1':
			continue
		else:
			position = geoIp.get_position(ip)

			if 'latitude' and 'longitude' in position:
				new_record = {
					'latitude': position['latitude'],
					'longitude': position['longitude']
				}

				restheart.update_record(id, new_record, 'dobjdls')
				counter = counter + 1
			else:
				print("Could not update", record)

	return counter


while UPDATE_PORTALUSE:
	print("Fetching " + str(pagesize) + " records")
	records = restheart.get_records_to_update(pagesize, 'portaluse')

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


while UPDATE_DOWNLOADS:
	print("Fetching " + str(pagesize) + " records")
	records = restheart.get_records_to_update(pagesize, 'dobjdls')

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