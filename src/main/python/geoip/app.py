from flask import Flask, jsonify
import time
from py.DB import DB
from py.QueryIpstack import query_ip

LOOKUP = {}
app = Flask(__name__)


@app.route('/ip/<ip>/<int:days_limit>', methods=['GET'])
@app.route('/ip/<ip>', methods=['GET'])
def ip_w_days_limit(ip, days_limit=-1):
	return jsonify(resolve_ip(ip, days_limit))


@app.route('/ips/<ips>/<int:days_limit>', methods=['GET'])
@app.route('/ips/<ips>', methods=['GET'])
def ips_w_days_limit(ips, days_limit=-1):
	ip_list = ips.split(',')
	locations = []

	for ip in ip_list:
		locations.append(resolve_ip(ip, days_limit))

	return jsonify(locations)


def resolve_ip(ip, days_limit):
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

	resolved_ip = get_location(ip, days_limit)

	if ip in LOOKUP: del LOOKUP[ip]
	return resolved_ip


def get_location(ip, days_limit):
	try:
		db_location = DB().get_location(ip, days_limit)

		if 'latitude' and 'longitude' in db_location:
			return db_location

		else:
			req = query_ip(ip)
			req_resp = req.json()

			if req.status_code == 200:
				if 'latitude' and 'longitude' in req_resp and \
						req_resp['latitude'] is not None and req_resp['longitude'] is not None:
					DB().set_location(req_resp['ip'], req_resp['latitude'], req_resp['longitude'])
					return req_resp

				elif 'error' in req_resp:
					return req_resp

				else:
					return {'error': 'Could not find location for ' + ip + ' in DB or through external service'}
			else:
				return req_resp

	except Exception as e:
		return {'error': ','.join(e.args)}


if __name__ == "__main__":
	# app.run(debug = False, host = '0.0.0.0', threaded=True, processes=4)
	app.run(debug = False, host = '0.0.0.0')
