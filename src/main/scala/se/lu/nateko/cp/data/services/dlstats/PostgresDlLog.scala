package se.lu.nateko.cp.data.services.dlstats

import java.sql.Connection
import java.sql.DriverManager
import se.lu.nateko.cp.data.DownloadStatsConfig
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import java.sql.ResultSet
import java.sql.Statement

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

		conf.dbNames.keys.foreach{implicit envri =>
			withTransaction(conf.admin)(_.execute(query))
		}
	}

	private def getConnection(creds: CredentialsConfig)(implicit envri: Envri): Connection = {
		driverClass
		val dbName = conf.dbNames(envri)
		val url = s"jdbc:postgresql://${conf.hostname}:${conf.port}/$dbName"
		DriverManager.getConnection(url, creds.username, creds.password)
	}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): T = {
		//TODO Use a configured fixed-size thread pool to produce a Future[T] instead of T
		val conn = getConnection(creds)
		try{
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def withTransaction(creds: CredentialsConfig)(act: Statement => Unit)(implicit envri: Envri): Unit = {
		withConnection(creds){conn =>
			val st = conn.createStatement()
			try{
				act(st)
				conn.commit()
			}finally{
				st.close()
			}
		}
	}
}
