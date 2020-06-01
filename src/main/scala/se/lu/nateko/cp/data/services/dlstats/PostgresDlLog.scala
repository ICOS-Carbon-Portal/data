package se.lu.nateko.cp.data.services.dlstats

import java.sql.Connection
import java.sql.DriverManager
import se.lu.nateko.cp.data.DownloadStatsConfig
import se.lu.nateko.cp.data.CredentialsConfig

class PostgresDlLog(conf: DownloadStatsConfig) {

	private lazy val driverClass = Class.forName("org.postgresql.Driver")

	def initLogTable(): Unit = {
		val query = s"""
		|CREATE TABLE IF NOT EXISTS public.dobjs (
		|	pid text NOT NULL PRIMARY KEY,
		|	spec text NOT NULL,
		|	sumbitter text NOT NULL,
		|	station text NULL,
		|	contributors _text NULL
		|);
		|CREATE INDEX IF NOT EXISTS idx_dobj_contrs ON public.dobjs USING GIN(contributors);
		|CREATE INDEX IF NOT EXISTS idx_dobj_spec ON public.dobjs USING HASH(spec);
		|CREATE TABLE IF NOT EXISTS public.dls (
		|	id serial PRIMARY KEY,
		|	ts timestamptz NOT NULL,
		|	pid text NOT NULL REFERENCES public.dobjs,
		|	ip text NULL,
		|	city text NULL,
		|	country_code text NULL,
		|	pos geometry NULL
		|);
		|CREATE INDEX IF NOT EXISTS dls_pid ON public.dls USING HASH(pid);
		|GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${conf.reader.username};
		|GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO ${conf.writer.username};
		|""".stripMargin

		withConnection(conf.admin){conn =>
			val st = conn.createStatement
			st.execute(query)
			st.close()
		}
	}

	private def getConnection(creds: CredentialsConfig): Connection = {
		driverClass
		val url = s"jdbc:postgresql://${conf.hostname}:${conf.port}/${conf.dbName}"
		DriverManager.getConnection(url, creds.username, creds.password)
	}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T): T = {
		//TODO Use a configured fixed-size thread pool to produce a Future[T] instead of T
		val conn = getConnection(creds)
		try{
			act(conn)
		} finally{
			conn.close()
		}
	}

}
