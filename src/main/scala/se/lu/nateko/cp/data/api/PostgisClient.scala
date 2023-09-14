package se.lu.nateko.cp.data.api

import akka.Done
import eu.icoscp.envri.Envri
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource
import org.postgresql.ds.PGConnectionPoolDataSource
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.data.PostgisConfig

import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import scala.concurrent.ExecutionContext
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.util.Try


abstract class PostgisClient(conf: PostgisConfig) extends AutoCloseable:

	private val executor =
		val queue = new LinkedBlockingQueue[Runnable]()
		val tpe = new ThreadPoolExecutor(conf.dbAccessPoolSize, conf.dbAccessPoolSize, 5, TimeUnit.MINUTES, queue)
		tpe.allowCoreThreadTimeOut(true)
		tpe

	protected given ExecutionContextExecutor = ExecutionContext.fromExecutor(executor)

	private val dataSources: Map[Envri, SharedPoolDataSource] = conf.dbNames.view.mapValues{ dbName =>
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

	override def close(): Unit =
		executor.shutdown()
		dataSources.valuesIterator.foreach{_.close()}

	protected def execute[T](credentials: CredentialsConfig)(action: Connection => T)(using Envri): Future[T] =
		withConnection(credentials){conn =>
			try
				val res = action(conn)
				conn.commit()
				res
			catch case ex: Throwable =>
				conn.rollback()
				throw ex
		}

	protected def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(using envri: Envri): Future[T] = Future{
		val dSource = dataSources.getOrElse(envri, throw CpDataException(s"Postgis has not been configured for ENVRI $envri"))
		val conn = dSource.getConnection(creds.username, creds.password)
		conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)

		try act(conn) finally conn.close()
	}

end PostgisClient
