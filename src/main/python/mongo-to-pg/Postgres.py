from configparser import ConfigParser
import psycopg2


class Postgres(object):
	def __init__(self, db_name):
		filename = 'database.ini'
		section = 'postgresql'

		parser = ConfigParser()
		parser.read(filename)

		self.db = {}

		if parser.has_section(section):
			self.db['database'] = db_name
			params = parser.items(section)
			for param in params:
				self.db[param[0]] = param[1]
		else:
			raise Exception('Section {0} not found in the {1} file'.format(section, filename))

	def connect(self):
		self.conn = None

		try:
			self.conn = psycopg2.connect(**self.db)
			self.cur = self.conn.cursor()

		except (Exception, psycopg2.DatabaseError) as error:
			print(error)

	def close(self):
		self.conn.close()

	def execute(self, sql, params = ()):
		self.cur.execute(sql, params)
		self.conn.commit()

	def get_version(self):
		self.connect()

		self.cur.execute('SELECT version()')
		version = self.cur.fetchone()

		self.close()

		return version
