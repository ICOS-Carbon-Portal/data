from flask import Flask, jsonify
import time
from py.DB import DB
from py.QueryIpstack import query_ip
from py.config import min_cols, default_cols, all_cols, access_key
import os


APP_ROOT = os.path.dirname(os.path.abspath(__file__))

try:
	with open(os.path.join(APP_ROOT, 'py', 'access_key'), 'r') as key_file:
		ipstack_access_key = key_file.readline()

except:
	ipstack_access_key = access_key


LOOKUP = {}
app = Flask(__name__)


@app.route('/all/<ip>', methods=['GET'])
@app.route('/all/<ip>/<int:days_limit>', methods=['GET'])
def lookup_ip_all(ip, days_limit=-1):
	return jsonify(resolve_ip(ip, all_cols, days_limit))


@app.route('/ip/<ip>', methods=['GET'])
@app.route('/ip/<ip>/<int:days_limit>', methods=['GET'])
@app.route('/ip/<ip>/<cols>', methods=['GET'])
@app.route('/ip/<ip>/<cols>/<int:days_limit>', methods=['GET'])
@app.route('/<ip>', methods=['GET'])
@app.route('/<ip>/<int:days_limit>', methods=['GET'])
@app.route('/<ip>/<cols>', methods=['GET'])
@app.route('/<ip>/<cols>/<int:days_limit>', methods=['GET'])
def lookup_ip(ip, cols=None, days_limit=-1):
	requested_cols = default_cols if cols is None else cols.replace(' ', '').split(',')
	return jsonify(resolve_ip(ip, requested_cols, days_limit))


def resolve_ip(ip, cols, days_limit):
	sleep_time = 0.5
	max_retries = 30 / sleep_time  # spend max 30 seconds waiting on other resolving
	current_try = 0

	while ip in LOOKUP:
		current_try = current_try + 1

		if current_try <= max_retries:
			time.sleep(sleep_time)
		else:
			if ip in LOOKUP: del LOOKUP[ip]
			return {'error': 'It took too long waiting on other resolving of IP ' + ip}

	resolved_ip = get_location(ip, cols, days_limit)

	if ip in LOOKUP: del LOOKUP[ip]
	return resolved_ip


def get_location(ip, cols, days_limit):
	verified_cols = verify_cols(cols)

	try:
		query_cols = set(verified_cols + min_cols)
		db_location = DB().get_location(ip, query_cols, days_limit)

		if 'latitude' and 'longitude' in db_location:
			return filter_result(db_location, verified_cols)

		else:
			req = query_ip(ip, ipstack_access_key)
			req_resp = req.json()

			if req.status_code == 200:
				if 'latitude' and 'longitude' in req_resp and \
						req_resp['latitude'] is not None and req_resp['longitude'] is not None:
					DB().save_location(req_resp)
					return filter_result(req_resp, verified_cols)

				elif 'error' in req_resp:
					return req_resp

				else:
					return {'error': 'Could not find location for ' + ip + ' in DB or through external service'}
			else:
				return req_resp

	except Exception as e:
		return {'error': ','.join(e.args)}


def verify_cols(requested_cols):
	return list(set(requested_cols).intersection(all_cols))


def filter_result(result, cols):
	return { key: result[key] for key in cols }


if __name__ == "__main__":
	# app.run(debug = False, host = '0.0.0.0', threaded=True, processes=4)
	app.run(debug = False, host = '0.0.0.0')
