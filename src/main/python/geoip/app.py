import IP2Location
import os
from flask import Flask, jsonify
from IP2Location.database import IP2LocationRecord
from typing import LiteralString, TypeAlias


IpInfo: TypeAlias = dict[str, str | int | float | None]


APP_ROOT = os.path.dirname(os.path.abspath(__file__))


app = Flask(__name__)


all_cols = 'ip,latitude,longitude,country_code,country_name,region_name,city'.split(',')
default_cols = 'ip,latitude,longitude,country_code,city'.split(',')


@app.route('/all/<ip>', methods=['GET'])
@app.route('/all/<ip>/<int:days_limit>', methods=['GET'])
def lookup_ip_all(ip: str, days_limit: int = -1):
	return jsonify(get_location(ip, all_cols, days_limit))


@app.route('/ip/<ip>', methods=['GET'])
@app.route('/ip/<ip>/<int:days_limit>', methods=['GET'])
@app.route('/ip/<ip>/<cols>', methods=['GET'])
@app.route('/ip/<ip>/<cols>/<int:days_limit>', methods=['GET'])
@app.route('/<ip>', methods=['GET'])
@app.route('/<ip>/<int:days_limit>', methods=['GET'])
@app.route('/<ip>/<cols>', methods=['GET'])
@app.route('/<ip>/<cols>/<int:days_limit>', methods=['GET'])
def lookup_ip(ip: str, cols: LiteralString | None = None, days_limit: int = -1):
	requested_cols = default_cols if cols is None else cols.replace(' ', '').split(',')
	return jsonify(get_location(ip, requested_cols, days_limit))


def get_location(ip: str, cols: list[LiteralString], days_limit: int) -> IpInfo:
	try:
		database = IP2Location.IP2Location(
			os.path.join('DB', 'IP2LOCATION-LITE-DB5.BIN'), 'SHARED_MEMORY')
		rec = database.get_all(ip)
	except:
		return {'error': (
			'Failure while trying to connect to IP2LOCATION database or while fetching'
			' information about IP address ' + ip + ' in IP2LOCATION database')}

	if not isinstance(rec, IP2LocationRecord):
		return {'error': f'No record was found in IP2LOCATION database for IP address {ip}'}
	if rec.country_short == 'INVALID IP ADDRESS':
		return {'error': 'Invalid IP address: ' + ip}
	if rec.country_short == 'IPV6 ADDRESS MISSING IN IPV4 BIN':
		return {'error': 'IPv6 address ' + ip + ' is missing in the IP2LOCATION database.'}
	if rec.country_short == '-':
		return {'error': f'Empty record in IP2LOCATION database for IP address {ip}'}

	return filter_record(rec, verify_cols(cols))


def verify_cols(requested_cols: list[LiteralString]) -> list[LiteralString]:
	return list(set(requested_cols).intersection(all_cols))


def filter_record(record: IP2LocationRecord, cols: list[LiteralString]):
	rec_dict: IpInfo = {}
	attr_lookup = {
		'country_code': 'country_short',
		'country_name': 'country_long',
		'region_name': 'region'}
	for key in cols:
		if key in attr_lookup:
			attr = attr_lookup[key]
		else:
			attr = key
		try:
			val = record.__getattribute__(attr)
		except AttributeError:
			continue
		if val != 'This parameter is unavailable in selected .BIN data file. Please upgrade data file.':
			if key in ['latitude', 'longitude']:
				rec_dict[key] = float(val)
			else:
				rec_dict[key] = val
	return rec_dict


if __name__ == "__main__":
	# app.run(debug = False, host = '0.0.0.0', threaded=True, processes=4)
	app.run(debug = False, host = '0.0.0.0')
