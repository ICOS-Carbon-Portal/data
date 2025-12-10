import sqlite3
import os
from IP2Location.database import IP2LocationRecord
from sqlite3 import Cursor, Row
from typing import LiteralString


PROJECT_ROOT = os.path.dirname(os.path.realpath(__file__ + '/../'))
DATABASE = os.path.join(PROJECT_ROOT, 'DB', 'ip.sqlite')


def dict_factory(cursor: Cursor, row: Row):
	d: dict[str, str | int] = {}
	for idx, col in enumerate(cursor.description):
		d[col[0]] = row[idx]
	return d


class DB(object):

	def __init__(self):
		self._conn = sqlite3.connect(DATABASE, timeout=3, detect_types=sqlite3.PARSE_DECLTYPES)
		self._dict_cur = self._conn.cursor()
		self._dict_cur.row_factory = dict_factory
		self._conn.commit()
		self._cur = self._conn.cursor()

	def __del__(self):
		self._conn.close()

	def get_location(self, ip: str, cols: set[LiteralString], days_limit: int) -> dict[str, str] | None:
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

	def save_location(self, rec: IP2LocationRecord) -> None:
		self.execute(
			'INSERT INTO ips\
				(ip, latitude, longitude, country_code, country_name, region_name, city)\
				VALUES\
				(:ip, :latitude, :longitude, :country_code, :country_name, :region_name, :city)',
			{
				'ip': rec.ip,
				'latitude': rec.latitude,
				'longitude': rec.longitude,
				'country_code': rec.country_short,
				'country_name': rec.country_long,
				'region_name': rec.region,
				'city': rec.city
			}
		)

	def select_dict(self, sql: str, params: dict[str, str | int] = {}) -> dict[str, str] | None:
		self._dict_cur.execute(sql, params)
		res = self._dict_cur.fetchall()

		return res[0] if len(res) > 0 else None

	def execute(self, sql: str, params: dict[str, str | int | float | None] = {}) -> None:
		self._cur.execute(sql, params)
		self._conn.commit()
