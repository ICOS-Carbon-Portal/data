from flask import Flask, jsonify
import IP2Location
from IP2Location.database import IP2LocationRecord
from typing import LiteralString, TypeAlias
from py.DB import DB
from py.config import min_cols, default_cols, all_cols
import os


IpInfo: TypeAlias = dict[str, str | int | float | None]


APP_ROOT = os.path.dirname(os.path.abspath(__file__))


app = Flask(__name__)


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
	verified_cols = verify_cols(cols)

	try:
		query_cols = set(verified_cols + min_cols)
		db_location = DB().get_location(ip, query_cols, days_limit)

		if db_location is not None:
			return filter_result(db_location, verified_cols)
		else:
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
			if rec.ip is None or rec.country_short == 'INVALID IP ADDRESS':
				return {'error': 'Invalid IP address: ' + ip}
			DB().save_location(rec)
			return filter_ip2location_record(rec, verified_cols)

	except Exception as e:
		return {'error': ','.join(e.args)}


def verify_cols(requested_cols: list[LiteralString]) -> list[LiteralString]:
	return list(set(requested_cols).intersection(all_cols))


def filter_result(result: dict[str, str], cols: list[LiteralString]) -> IpInfo:
	return { key: result[key] for key in cols }


def filter_ip2location_record(record: IP2LocationRecord, cols: list[LiteralString]):
	rec_dict: IpInfo = {}
	for key in cols:
		if key == 'country_code':
			attr = 'country_short'
		elif key == 'country_name':
			attr = 'country_long'
		elif key == 'region_name':
			attr = 'region'
		else:
			attr = key
		try:
			val = record.__getattribute__(attr)
		except AttributeError:
			continue
		if val != 'This parameter is unavailable in selected .BIN data file. Please upgrade data file.':
			rec_dict[key] = val
	return rec_dict


if __name__ == "__main__":
	# app.run(debug = False, host = '0.0.0.0', threaded=True, processes=4)
	app.run(debug = False, host = '0.0.0.0')
