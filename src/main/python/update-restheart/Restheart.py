import requests


class Restheart(object):
	def __init__(self):
		self._baseUrl = 'http://127.0.0.1:8088/db/'		# localhost
		# self._baseUrl = 'http://127.0.0.1:8888/db/'	# production

	def get_records_to_update(self, pagesize, collection):
		resp = None

		try:
			url = self.get_url(pagesize, collection)
			resp = requests.get(url, timeout=10, verify=False)

			if resp.status_code != 200:
				print(resp.status_code, resp.reason, resp.json())

			return resp.json()
		except:
			print(resp)

	def update_record(self, id, record, collection):
		url = self._baseUrl + collection + '/' + id
		headers = {"Content-Type": "application/json"}
		resp = None

		try:
			resp = requests.patch(url, headers=headers, json=record, timeout=5, verify=False)

			if resp.status_code != 200:
				print(resp.status_code, resp.reason)
		except:
			print(resp)

	def get_url(self, pagesize, collection):
		if collection == 'portaluse':
			return self._baseUrl + collection + '?filter={"city":{"$exists":0}}&np&pagesize=' + str(pagesize)

		elif collection == 'dobjdls':
			return self._baseUrl + collection + '?filter={"$and":[{"ip":{"$exists":1}},{"city":{"$exists":0}}]}&np&pagesize=' + str(pagesize)

		else:
			raise ValueError("Unknown collection: " + collection)
