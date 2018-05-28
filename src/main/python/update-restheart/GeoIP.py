import requests


class GeoIP(object):
	def __init__(self):
		self._baseUrl = 'https://geoip.icos-cp.eu/ip/'

	def get_position(self, ip):
		url = self._baseUrl + ip

		resp = requests.get(url, timeout=10, verify=False)
		return resp.json()