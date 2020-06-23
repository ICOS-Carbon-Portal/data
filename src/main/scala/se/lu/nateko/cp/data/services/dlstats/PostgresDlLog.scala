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
import scala.concurrent.ExecutionContext
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.ArrayBlockingQueue
import org.postgresql.ds.PGConnectionPoolDataSource
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource


class PostgresDlLog(conf: DownloadStatsConfig) extends AutoCloseable{

	private[this] val executor = {
		val maxThreads = conf.dbAccessPoolSize * conf.dbNames.size
		new ThreadPoolExecutor(
			1, maxThreads, 30, TimeUnit.SECONDS, new ArrayBlockingQueue[Runnable](maxThreads)
		)
	}

	private[this] implicit val exeCtxt = ExecutionContext.fromExecutor(executor)

	private[this] val dataSources: Map[Envri, SharedPoolDataSource] = conf.dbNames.view.mapValues{ dbName =>
		val pgDs = new PGConnectionPoolDataSource()
		pgDs.setServerNames(Array(conf.hostname))
		pgDs.setDatabaseName(dbName)
		pgDs.setPortNumbers(Array(conf.port))
		val ds = new SharedPoolDataSource()
		ds.setMaxTotal(conf.dbAccessPoolSize)
		ds.setConnectionPoolDataSource(pgDs)
		ds.setDefaultAutoCommit(false)
		ds
	}.toMap

	override def close(): Unit = {
		executor.shutdown()
		dataSources.valuesIterator.foreach{_.close()}
	}

	def initLogTables(): Unit = {
		val query = Source.fromResource("sql/logging/initLogTables.sql").mkString

		conf.dbNames.keys.foreach{implicit envri =>
			withConnection(conf.admin){
				_.createStatement().execute(query)
			}
		}
	}

	def writeDobjInfo(dobj: DataObject)(implicit envri: Envri): Future[Done] = {
		execute(conf.writer)(conn => {
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

			} finally {
				dobjsSt.close()
				deleteContribSt.close()
				insertContribSt.close()
			}
		})
	}

	private def getConnection(creds: CredentialsConfig)(implicit envri: Envri): Future[Connection] = Future{
		dataSources(envri).getConnection(creds.username, creds.password)
	}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): Future[T] =
		getConnection(creds).map{conn =>
			conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
			try {
				act(conn)
			} finally{
				conn.close()
			}
		}

	private def execute(credentials: CredentialsConfig)(action: Connection => Unit)(implicit envri: Envri): Future[Done] = {
		withConnection(credentials){conn =>
			try {
				action(conn)
				conn.commit()
				Done
			} catch {
				case ex: Throwable =>
					conn.rollback()
					throw ex
			}
		}
	}

	private def withTransaction(creds: CredentialsConfig)(query: String)(act: PreparedStatement => Unit)(implicit envri: Envri): Unit = {
		withConnection(creds){conn =>
			val st = conn.prepareStatement(query)
			try{
				act(st)
				conn.commit()
			}finally{
				st.close()
			}
		}
	}
}
