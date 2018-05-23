import requests


def query_ip(ip, fields, access_key):
	url = 'http://api.ipstack.com/{}?fields={}&access_key={}&output=json'.format(ip, fields, access_key)

	return requests.get(url, timeout=30)
