import requests


class Restheart(object):
	def __init__(self):
		# self._baseUrl = 'http://127.0.0.1:8088/db/'		# localhost
		self._baseUrl = 'https://restheart.icos-cp.eu/db/'	# production
		self._verfify = True if self._baseUrl.__contains__('restheart') else False

	def get_records_to_update(self, op, pagesize, collection):
		resp = None

		try:
			url = self.get_url(op, pagesize, collection)
			resp = requests.get(url, timeout=10, verify=self._verfify)

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
			resp = requests.patch(url, headers=headers, json=record, timeout=5, verify=self._verfify)

			if resp.status_code != 200:
				print(resp.status_code, resp.reason)
		except:
			print(resp)

	def get_url(self, op, pagesize, collection):
		if op == 'geo':
			if collection == 'portaluse':
				return self._baseUrl + collection + '?filter={"city":{"$exists":0}}&np&pagesize=' + str(pagesize)

			elif collection == 'dobjdls':
				return self._baseUrl + collection + '?filter={"$and":[{"ip":{"$exists":1}},{"city":{"$exists":0}}]}&np&pagesize=' + str(pagesize)

			else:
				raise ValueError("Unknown collection: " + collection)

		elif op == 'label':
			if collection == 'portaluse':
				return self._baseUrl + collection + '?np&pagesize=' + str(pagesize)
				# return self._baseUrl + collection + '?filter={"_id":{"$oid":"5bb21519f17df4d065e9c53c"}}&np&pagesize=' + str(pagesize)
				# return self._baseUrl + collection + '?filter={"filterChange":{"$exists":1}}&np&pagesize=' + str(pagesize)
				# return self._baseUrl + collection + '?filter={"previewNetCDF":{"$exists":1}}&np&pagesize=' + str(pagesize)
				# return self._baseUrl + collection + '?filter={"previewTimeserie":{"$exists":1}}&np&pagesize=' + str(pagesize)
				# return self._baseUrl + collection + '?filter={"$and":[{"filterChange":{"$exists":0}},{"previewNetCDF":{"$exists":0}},{"previewTimeserie":{"$exists":0}}]}&np&pagesize=' + str(pagesize)

			else:
				raise ValueError("Unknown collection: " + collection)
