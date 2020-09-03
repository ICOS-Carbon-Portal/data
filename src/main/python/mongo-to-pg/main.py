from Restheart import Restheart
from Postgres import Postgres
import os
from bson import ObjectId
import json
from time import time
from datetime import timedelta


def process_records(pg, records):
	counter = 0
	skipped = 0
	pg.connect()

	for record_raw in records:
		record = json.dumps(record_raw, separators=(',', ':'))

		id = record_raw['_id']['$oid']
		# time in UTC
		ts = ObjectId(id).generation_time.strftime("%Y-%m-%d %H:%M:%S")
		dobj = record_raw.get('dobj')
		pid_raw = None if dobj is None else dobj.get('pid')
		hash_id = None if pid_raw is None else pid_raw.split('/')[1]

		if hash_id == None:
			skipped = skipped + 1
		else:
			sql = "INSERT INTO public.rawjson (ts, hash_id, jsondata) VALUES(%s::timestamptz at time zone 'utc', %s, %s)"
			pg.execute(sql, (ts, hash_id, record))
			counter = counter + 1

	pg.close()
	print('Processed', counter, 'records')
	if skipped > 0:
		print('Skipped', skipped, 'records due to missing hash_id')
	return counter


def import_to_pg(restheart_db_name, pg_db_name):
	pagesize = 1000
	processed_count = 0

	restheart = Restheart(restheart_db_name)
	pg = Postgres(pg_db_name)

	tot = 0
	page = 0

	while True:
		page = page + 1
		records = restheart.get_records(page, pagesize, 'dobjdls')

		if records is None:
			print("No records found -> Exiting")
			break
		else:
			# counted_updates = update_download_records(records)
			tot = tot + process_records(pg, records)

		if len(records) < pagesize:
			print('Processed in total', tot, 'records')
			break

start_time = time()

import_to_pg('db', 'cplog')
import_to_pg('sitesdb', 'siteslog')

runtime_seconds = time() - start_time
# Execution time: 1:31:57.138395
print('Execution time:', str(timedelta(seconds=runtime_seconds)))
