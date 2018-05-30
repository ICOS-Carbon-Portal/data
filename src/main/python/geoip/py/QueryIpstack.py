import requests


def query_ip(ip, access_key):
	url = 'http://api.ipstack.com/{}?access_key={}&output=json'.format(ip, access_key)

	return requests.get(url, timeout=30)
