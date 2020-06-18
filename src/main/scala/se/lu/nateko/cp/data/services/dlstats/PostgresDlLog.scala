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
import java.sql.PreparedStatement
import scala.concurrent.Future
import akka.Done
import scala.util.Try
import scala.util.Success
import scala.util.Failure
import java.nio.file.Files
import java.nio.file.Paths
import scala.io.Source


class PostgresDlLog(conf: DownloadStatsConfig) {

	private lazy val driverClass = Class.forName("org.postgresql.Driver")

	def initLogTables(): Unit = {
		conf.dbNames.keys.foreach{implicit envri =>
			withConnection(conf.admin){
				_.createStatement().execute(Source.fromResource("sql/logging/initLogTables.sql").mkString)
			}
		}
	}

	def writeDobjInfo(dobj: DataObject)(implicit envri: Envri): Try[Done] = {
		execute(conf.admin)(conn => {
			val dobjsQuery = """
				|INSERT INTO dobjs(hash_id, spec, submitter, station)
				|VALUES (?, ?, ?, ?)
				|ON CONFLICT (hash_id) DO UPDATE
				|	SET spec = EXCLUDED.spec, submitter = EXCLUDED.submitter, station = EXCLUDED.station
				|""".stripMargin
			val dobjsSt = conn.prepareStatement(dobjsQuery)
			val deleteContribSt = conn.prepareStatement("DELETE FROM contributors WHERE hash_id = ?")
			val insertContribSt = conn.prepareStatement("INSERT INTO contributors(hash_id, contributor) VALUES (?, ?)")

			try {
				val Seq(hash_id, spec, submitter, station) = 1 to 4

				val stationValue: String = dobj.specificInfo match {
					case Left(_) => "NULL"
					case Right(lessSpecific) => lessSpecific.acquisition.station.org.self.uri.toString
				}

				val contribs = dobj.specificInfo.fold(
					_.productionInfo.contributors,
					_.productionInfo.toSeq.flatMap(_.contributors)
				)

				dobjsSt.setString(hash_id, dobj.hash.id)
				dobjsSt.setString(spec, dobj.specification.self.uri.toString)
				dobjsSt.setString(submitter, dobj.submission.submitter.self.uri.toString)
				dobjsSt.setString(station, stationValue)
				dobjsSt.executeUpdate()

				deleteContribSt.setString(1, dobj.hash.id)
				deleteContribSt.executeUpdate()

				for (contributor <- contribs.map(_.self.uri.toString).distinct){
					insertContribSt.setString(1, dobj.hash.id)
					insertContribSt.setString(2, contributor)
					insertContribSt.addBatch()
				}

				insertContribSt.executeBatch()
				
			} catch {
				case ex: Throwable => throw ex
			} finally {
				dobjsSt.close()
				deleteContribSt.close()
				insertContribSt.close()
			}
		})
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
		conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
		try {
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def execute(credentials: CredentialsConfig)(action: Connection => Unit)(implicit envri: Envri): Try[Done] = {
		withConnection(credentials){conn =>
			val initAutoCom = conn.getAutoCommit
			conn.setAutoCommit(false)

			try {
				action(conn)
				conn.commit()
				Success(Done)
			} catch {
				case ex: Throwable =>
					conn.rollback()
					Failure(ex)
			} finally {
				conn.setAutoCommit(initAutoCom)
			}
		}
	}

	private def withTransaction(creds: CredentialsConfig)(query: String)(act: PreparedStatement => Unit)(implicit envri: Envri): Unit = {
		withConnection(creds){conn =>
			val initAutoCom = conn.getAutoCommit
			conn.setAutoCommit(false)
			val st = conn.prepareStatement(query)

			try{
				act(st)
				conn.commit()
			}finally{
				st.close()
				conn.setAutoCommit(initAutoCom)
			}
		}
	}
}
