import requests


class Restheart(object):
	def __init__(self, db_name):
		self._baseUrl = 'https://restheart.icos-cp.eu/' + db_name + '/'
		self._verfify = True if self._baseUrl.__contains__('restheart') else False

	def get_records(self, page, pagesize, collection):
		resp = None

		try:
			url = self.get_url(page, pagesize, collection)
			print('Querying ' + url)
			resp = requests.get(url, timeout=10, verify=self._verfify)

			if resp.status_code != 200:
				print(resp.status_code, resp.reason, resp.json())

			return resp.json()
		except:
			print(resp)

	def get_url(self, page, pagesize, collection):
		if collection == 'portaluse':
			return self._baseUrl + collection + '?filter={"city":{"$exists":0}}&np&pagesize=' + str(pagesize)

		elif collection == 'dobjdls':
			return self._baseUrl + collection + '?filter={"dobj": {"$exists": 1}}&np&page=' + str(page) + '&pagesize=' + str(pagesize)

		else:
			raise ValueError("Unknown collection: " + collection)
