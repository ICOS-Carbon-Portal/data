package se.lu.nateko.cp.data.api

import akka.Done
import eu.icoscp.envri.Envri
import org.apache.commons.dbcp2.datasources.SharedPoolDataSource
import org.postgresql.ds.PGConnectionPoolDataSource
import se.lu.nateko.cp.data.CredentialsConfig
import se.lu.nateko.cp.data.PostgisConfig
import eu.icoscp.geoipclient.GeoIpInfo

import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Timestamp
import java.sql.Types
import java.time.Instant
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

class PostgisEventWriter(conf: PostgisConfig) extends AutoCloseable:

	//private def conf(using e: Envri) = confs(e)

	def logDownload(dlInfo: DlEventForPostgres, ip: Either[String, GeoIpInfo])(using Envri): Future[Done] = withTransaction(conf.writer){
		"SELECT addDownloadRecord(_item_type:=?, _ts:=?, _hash_id:=?, _ip:=?, _city:=?, _country_code:=?, _lon:=?, _lat:=?, _distributor:=?, _endUser:=?)"
	}{st =>
		def setOptVarchar(strOpt: Option[String], idx: Int): Unit = strOpt match{
			case Some(s) => st.setString(idx, s)
			case None => st.setNull(idx, Types.VARCHAR)
		}

		val Seq(item_type, ts, hash_id, ip_idx, city, country_code, lon, lat, distributor_idx, endUser_idx) = 1 to 10

		val itemType = dlInfo match
			case _: DataObjDownloadInfo => "data"
			case _: DocumentDownloadInfo => "document"
			case _: CollectionDownloadInfo => "collection"
		st.setString(item_type, itemType)
		st.setTimestamp(ts, java.sql.Timestamp.from(dlInfo.time))
		st.setString(hash_id, dlInfo.hashId)
		st.setString(ip_idx, ip.fold(identity, _.ip))

		ip.fold(
			ip => {
				st.setNull(city, Types.VARCHAR)
				st.setNull(country_code, Types.VARCHAR)
				st.setNull(lon, Types.DOUBLE)
				st.setNull(lat, Types.DOUBLE)
			},
			geo => {
				setOptVarchar(geo.city, city)
				setOptVarchar(geo.country_code, country_code)

				st.setDouble(lon, geo.longitude)
				st.setDouble(lat, geo.latitude)
			}
		)

		val dobjOpt = Option(dlInfo).collect{ case d: DataObjDownloadInfo => d }

		dobjOpt.flatMap(_.distributor) match
			case Some(distributor) => st.setString(distributor_idx, distributor)
			case _                 => st.setNull(distributor_idx, Types.VARCHAR)

		dobjOpt.flatMap(dodi => dodi.endUser.orElse(dodi.cpUser)) match
			case Some(endUser) => st.setString(endUser_idx, endUser)
			case _             => st.setNull(endUser_idx, Types.VARCHAR)

		st.execute()
	}


	private[this] val executor =
		val maxThreads = conf.dbAccessPoolSize
		new ThreadPoolExecutor(
			1, maxThreads, 30, TimeUnit.SECONDS, new ArrayBlockingQueue[Runnable](maxThreads)
		)

	private given ExecutionContext = ExecutionContext.fromExecutor(executor)

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

	override def close(): Unit =
		executor.shutdown()
		dataSources.valuesIterator.foreach{_.close()}

	private def withConnection[T](creds: CredentialsConfig)(act: Connection => T)(using envri: Envri): Future[T] = Future{
		val conn = dataSources(envri).getConnection(creds.username, creds.password)
		conn.setHoldability(ResultSet.CLOSE_CURSORS_AT_COMMIT)
		try {
			act(conn)
		} finally{
			conn.close()
		}
	}

	private def withTransaction(creds: CredentialsConfig)(query: String)(act: PreparedStatement => Unit)(using Envri): Future[Done] =
		withConnection(creds){conn =>
			val st = conn.prepareStatement(query)
			try{
				act(st)
				conn.commit()
				Done
			}finally{
				st.close()
			}
		}

end PostgisEventWriter