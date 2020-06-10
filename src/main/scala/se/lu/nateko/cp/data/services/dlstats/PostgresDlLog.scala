package se.lu.nateko.cp.data.services.dlstats

import java.sql.Connection
import java.sql.DriverManager
import se.lu.nateko.cp.data.DownloadStatsConfig
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import java.sql.ResultSet
import java.sql.Statement
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.L2OrLessSpecificMeta
import se.lu.nateko.cp.meta.core.data.L3SpecificMeta


class PostgresDlLog(conf: DownloadStatsConfig) {

	private lazy val driverClass = Class.forName("org.postgresql.Driver")

	def initLogTable(): Unit = {
		val query = s"""
		|DROP TABLE dls;
		|DROP TABLE dobjs;
		|CREATE EXTENSION IF NOT EXISTS postgis;
		|CREATE TABLE IF NOT EXISTS public.dobjs (
		|	hash_id text NOT NULL PRIMARY KEY,
		|	spec text NOT NULL,
		|	sumbitter text NOT NULL,
		|	station text NULL,
		|	contributors _text NULL
		|);
		|CREATE INDEX IF NOT EXISTS idx_dobj_contrs ON public.dobjs USING GIN(contributors);
		|CREATE INDEX IF NOT EXISTS idx_dobj_spec ON public.dobjs USING HASH(spec);
		|CREATE TABLE IF NOT EXISTS public.dls (
		|	id int8 NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
		|	ts timestamptz NOT NULL,
  		|	hash_id text NOT NULL REFERENCES public.dobjs,
		|	ip text NULL,
		|	city text NULL,
		|	country_code text NULL,
		|	pos geometry NULL
		|);
  		|CREATE INDEX IF NOT EXISTS dls_hash_id ON public.dls USING HASH(hash_id);
		|GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${conf.reader.username};
		|GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO ${conf.writer.username};
		|""".stripMargin

		conf.dbNames.keys.foreach{implicit envri =>
			withTransaction(conf.admin)(_.execute(query))
		}
	}

	def writeDobjInfo(dobj: DataObject)(implicit envri: Envri): Unit = {
		val conn = getConnection(conf.admin)
		val pStatement = conn.prepareStatement(s"""
		|INSERT INTO dobjs(hash_id, spec, submitter, station, contributors)
		|VALUES (?, ?, ?, ?, ?)
		|ON CONFLICT (hash_id) DO UPDATE
		|	SET spec = EXCLUDED.spec, submitter = EXCLUDED.submitter, station = EXCLUDED.station, contributors = EXCLUDED.contributors
		|""")
		
		try {
			val Seq(hash_id, spec, submitter, station, contributors) = 1 to 5

			val stationValue: String = dobj.specificInfo match {
				case Left(_) => "NULL"
				case Right(lessSpecific) => lessSpecific.acquisition.station.org.self.uri.toString()
			}

			val contributorValues: String = dobj.specificInfo match {
				case Left(specific) => specific.productionInfo.contributors.map(agent => agent.self.uri).mkString("ARRAY['", "', '", "']")
				case Right(lessSpecific) => lessSpecific.productionInfo match { 
					case Some(productionInfo) => productionInfo.contributors.map(agent => agent.self.uri).mkString("ARRAY['", "', '", "']")
					case None => "NULL"
				}
			}

			pStatement.setString(hash_id, dobj.hash.id)
			pStatement.setString(spec, dobj.specification.self.uri.toString())
			pStatement.setString(submitter, dobj.submission.submitter.self.uri.toString())
			pStatement.setString(station, stationValue)
			pStatement.setString(contributors, contributorValues)

			pStatement.executeUpdate()

		} catch {
			case ex: Exception => throw new Exception(ex.getMessage())
		} finally {
			conn.close()
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
			conn.setAutoCommit(false)
			conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)

			try{
				act(st)
				conn.commit()
			}finally{
				st.close()
			}
		}
	}
}
