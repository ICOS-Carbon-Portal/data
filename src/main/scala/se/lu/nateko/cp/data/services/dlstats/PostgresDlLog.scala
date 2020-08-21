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
import java.sql.Types
import se.lu.nateko.cp.data.routes.QueryParams
import se.lu.nateko.cp.data.routes.DownloadStats


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
		ds.setDefaultMinIdle(1)
		ds.setDefaultMaxIdle(2)
		ds.setConnectionPoolDataSource(pgDs)
		ds.setDefaultAutoCommit(false)
		ds
	}.toMap

	override def close(): Unit = {
		executor.shutdown()
		dataSources.valuesIterator.foreach{_.close()}
	}

	def initLogTables(): Future[Done] = {
		val query = Source.fromResource("sql/logging/initLogTables.sql").mkString

		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn => {
				conn.createStatement().execute(query)
				conn.commit()
			})
		}.toIndexedSeq
		Future.sequence(futs).map(_ => Done)
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

				val contribs = dobj.specificInfo.fold(
					_.productionInfo.contributors,
					_.productionInfo.toSeq.flatMap(_.contributors)
				)

				dobjsSt.setString(hash_id, dobj.hash.id)
				dobjsSt.setString(spec, dobj.specification.self.uri.toString)
				dobjsSt.setString(submitter, dobj.submission.submitter.self.uri.toString)
				dobj.specificInfo match {
					case Left(_) => dobjsSt.setNull(station, Types.VARCHAR)
					case Right(lessSpecific) => dobjsSt.setString(station, lessSpecific.acquisition.station.org.self.uri.toString)
				}
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

	def downloadsByCountry(queryParams: QueryParams)(implicit envri: Envri): Future[IndexedSeq[DownloadStats]] = {
		query(conf.writer)(conn => {
			val queryStr = """
				|SELECT
				|	COUNT(downloads.hash_id ) AS count,
				|	downloads.country_code
				|FROM dobjs
				|	INNER JOIN downloads ON dobjs.hash_id = downloads.hash_id
				|WHERE (
				|	(FALSE = ? OR dobjs.spec = ANY (?))
				|	AND (FALSE = ? OR dobjs.station = ANY (?))
				|	AND (FALSE = ? OR dobjs.submitter = ANY (?))
				|	AND (FALSE = ? OR EXISTS (SELECT 1 FROM contributors WHERE hash_id = dobjs.hash_id AND contributor = ANY(?)))
				|)
				|GROUP BY country_code
				|""".stripMargin

			val Seq(useSpec, spec, useStation, station, useSubmitter, submitter, useContributor, contributor) = 1 to 8
			val preparedSt = conn.prepareStatement(queryStr)
			
			queryParams.specs match {
				case Some(list) =>
					preparedSt.setBoolean(useSpec, true)
					preparedSt.setArray(spec, conn.createArrayOf("varchar", list.toArray))
				case None =>
					preparedSt.setBoolean(useSpec, false)
					preparedSt.setArray(spec, conn.createArrayOf("varchar", Array()))
			}

			queryParams.stations match {
				case Some(list) =>
					preparedSt.setBoolean(useStation, true)
					preparedSt.setArray(station, conn.createArrayOf("varchar", list.toArray))
				case None =>
					preparedSt.setBoolean(useStation, false)
					preparedSt.setArray(station, conn.createArrayOf("varchar", Array()))
			}

			queryParams.submitters match {
				case Some(list) =>
					preparedSt.setBoolean(useSubmitter, true)
					preparedSt.setArray(submitter, conn.createArrayOf("varchar", list.toArray))
				case None =>
					preparedSt.setBoolean(useSubmitter, false)
					preparedSt.setArray(submitter, conn.createArrayOf("varchar", Array()))
			}

			queryParams.contributors match {
				case Some(list) =>
					preparedSt.setBoolean(useContributor, true)
					preparedSt.setArray(contributor, conn.createArrayOf("varchar", list.toArray))
				case None =>
					preparedSt.setBoolean(useContributor, false)
					preparedSt.setArray(contributor, conn.createArrayOf("varchar", Array()))
			}

			consumeResultSet(preparedSt.executeQuery()){rs => 
				DownloadStats(rs.getInt("count"), rs.getString("country_code"))
			}
		})
	}

	def consumeResultSet[T](resultSet: ResultSet)(fn: ResultSet => T): IndexedSeq[T] = {
		val res = scala.collection.mutable.Buffer.empty[T]
		while(resultSet.next()){
			res += fn(resultSet)
		}
		resultSet.close()
		res.toIndexedSeq
	}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(implicit envri: Envri): Future[T] = Future{
		val conn = dataSources(envri).getConnection(creds.username, creds.password)
		conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
		try {
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def query[T](credentials: CredentialsConfig)(action: Connection => IndexedSeq[T])(implicit envri: Envri): Future[IndexedSeq[T]] = {
		withConnection(credentials){conn =>
			action(conn)
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

}
