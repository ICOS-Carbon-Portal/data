import requests
from .config import fields, access_key


def query_ip(ip):
	url = 'http://api.ipstack.com/{}?fields={}&access_key={}&output=json'.format(ip, fields, access_key)

	return requests.get(url, timeout=30)
