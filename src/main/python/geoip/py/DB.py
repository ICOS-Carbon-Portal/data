import sqlite3
import os


PROJECT_ROOT = os.path.dirname(os.path.realpath(__file__ + '/../'))
DATABASE = os.path.join(PROJECT_ROOT, 'DB', 'ip.sqlite')


def dict_factory(cursor, row):
	d = {}
	for idx, col in enumerate(cursor.description):
		d[col[0]] = row[idx]
	return d


class DB(object):
	_conn = None
	_cur = None

	def __init__(self):
		self._conn = sqlite3.connect(DATABASE, timeout=3, detect_types=sqlite3.PARSE_DECLTYPES)
		self._dict_cur = self._conn.cursor()
		self._dict_cur.row_factory = dict_factory
		self._conn.commit()
		self._cur = self._conn.cursor()

	def __del__(self):
		self._conn.close()

	def get_location(self, ip, cols, days_limit):
		if days_limit < 0:
			return self.select_dict(
				"""
				SELECT
					""" + ','.join(cols) + """
				FROM ips
				WHERE ip = :ip
				ORDER BY ts DESC
				LIMIT 1""",
				{'ip': ip}
			)
		else:
			return self.select_dict(
				"""
				SELECT
					""" + ','.join(cols) + """
				FROM ips
				WHERE ip = :ip AND (julianday('now') - julianday(ts)) < :days_limit
				ORDER BY ts DESC
				LIMIT 1""",
				{'ip': ip, 'days_limit': days_limit}
			)

	def save_location(self, resp):
		ip = resp['ip']
		latitude = resp['latitude']
		longitude = resp['longitude']
		continent_code = resp['continent_code']
		continent_name = resp['continent_name']
		country_code = resp['country_code']
		country_name = resp['country_name']
		region_code = resp['region_code']
		region_name = resp['region_name']
		city = resp['city']
		zip = resp['zip']
		is_eu = resp['location']['is_eu']

		self.execute(
			'INSERT INTO ips\
				(ip, latitude, longitude, continent_code, continent_name, country_code, country_name, region_code, region_name, city, zip, is_eu)\
				VALUES\
				(:ip, :latitude, :longitude, :continent_code, :continent_name, :country_code, :country_name, :region_code, :region_name, :city, :zip, :is_eu)',
			{
				'ip': ip,
				'latitude': latitude,
				'longitude': longitude,
				'continent_code': continent_code,
				'continent_name': continent_name,
				'country_code': country_code,
				'country_name': country_name,
				'region_code': region_code,
				'region_name': region_name,
				'city': city,
				'zip': zip,
				'is_eu': is_eu
			}
		)

	def select_dict(self, sql, params = ()):
		self._dict_cur.execute(sql, params)
		res = self._dict_cur.fetchall()

		return (res[0] if res else None) if len(res) == 1 else res

	def execute(self, sql, params = ()):
		self._cur.execute(sql, params)
		self._conn.commit()
