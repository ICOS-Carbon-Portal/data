package se.lu.nateko.cp.data.api

import akka.Done
import akka.event.LoggingAdapter
import eu.icoscp.envri.Envri
import eu.icoscp.geoipclient.GeoIpInfo
import se.lu.nateko.cp.data.PostgisConfig
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.data.Agent
import se.lu.nateko.cp.meta.core.data.DataObject

import java.sql.Types
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import scala.concurrent.Future
import scala.io.Source


class PostgisEventWriter(conf: PostgisConfig, log: LoggingAdapter) extends PostgisClient(conf):

	private val scheduler = Executors.newSingleThreadScheduledExecutor()

	override def close(): Unit =
		super.close()
		scheduler.shutdown()

	def initLogTables(): Future[Done] = if conf.skipInit then done else
		val query = Source.fromResource("sql/logging/initLogTables.sql").mkString
		val matViews = Seq(
			"downloads_country_mv", "downloads_timebins_mv", "dlstats_mv",
			"dlstats_full_mv", "specifications_mv", "contributors_mv", "stations_mv",
			"submitters_mv"
		)

		val futs = conf.dbNames.keys.map{implicit envri =>
			withConnection(conf.admin)(conn =>
				val st = conn.createStatement()
				st.execute(query)
				st.close()
				conn.commit()
			).map{_ =>
				val now = Instant.now()
				val nextMidnight = now.atOffset(ZoneOffset.UTC).toLocalDate().plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
				val minsToMidnight = ChronoUnit.MINUTES.between(now, nextMidnight)
				scheduler.scheduleWithFixedDelay(() => matViews.foreach(updateMatView), minsToMidnight + 37, 1440, TimeUnit.MINUTES)
			}
		}.toIndexedSeq
		Future.sequence(futs).map{_ => Done}

	def logDownload(dlInfo: DlEventForPostgres, ip: Either[String, GeoIpInfo])(using Envri): Future[Done] = execute(conf.writer){conn =>
		val logQuery = "SELECT addDownloadRecord(_item_type:=?, _ts:=?, _hash_id:=?, _ip:=?, _city:=?, _country_code:=?, _lon:=?, _lat:=?, _distributor:=?, _endUser:=?)"
		val st = conn.prepareStatement(logQuery)

		def setOptVarchar(strOpt: Option[String], idx: Int): Unit = strOpt match
			case Some(s) => st.setString(idx, s)
			case None => st.setNull(idx, Types.VARCHAR)

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
		st.close()
	}

	def writeDobjInfo(dobj: DataObject)(using Envri): Future[Done] = execute(conf.writer){conn =>
		val dobjsQuery = """
					|INSERT INTO dobjs(hash_id, spec, submitter, station)
					|VALUES (?, ?, ?, ?)
					|ON CONFLICT (hash_id) DO UPDATE
					|	SET spec = EXCLUDED.spec, submitter = EXCLUDED.submitter, station = EXCLUDED.station
					|""".stripMargin

		val dobjsSt = conn.prepareStatement(dobjsQuery)
		val deleteContribSt = conn.prepareStatement("DELETE FROM contributors WHERE hash_id = ?")
		val insertContribSt = conn.prepareStatement("INSERT INTO contributors(hash_id, contributor) VALUES (?, ?)")

		try
			val Seq(hash_id, spec, submitter, station) = 1 to 4

			val contribs: Seq[Agent] = (
				dobj.references.authors.toSeq.flatten ++
				dobj.production.toSeq.flatMap(prodInfo =>
					prodInfo.contributors :+ prodInfo.creator
				)
			).distinct

			dobjsSt.setString(hash_id, dobj.hash.id)
			dobjsSt.setString(spec, dobj.specification.self.uri.toString)
			dobjsSt.setString(submitter, dobj.submission.submitter.self.uri.toString)
			dobj.specificInfo match
				case Left(_) => dobjsSt.setNull(station, Types.VARCHAR)
				case Right(lessSpecific) => dobjsSt.setString(station, lessSpecific.acquisition.station.org.self.uri.toString)
			dobjsSt.executeUpdate()

			deleteContribSt.setString(1, dobj.hash.id)
			deleteContribSt.executeUpdate()

			for (contributor <- contribs.map(_.self.uri.toString).distinct){
				insertContribSt.setString(1, dobj.hash.id)
				insertContribSt.setString(2, contributor)
				insertContribSt.addBatch()
			}

			insertContribSt.executeBatch()

		finally
			dobjsSt.close()
			deleteContribSt.close()
			insertContribSt.close()
	}

	private def updateMatView(matView: String)(using envri: Envri): Unit =
		withConnection(conf.admin){conn =>
			// Disable transactions
			conn.setAutoCommit(true)
			val st = conn.createStatement
			try
				st.execute(s"REFRESH MATERIALIZED VIEW CONCURRENTLY $matView ;")
				st.execute(s"VACUUM (ANALYZE) $matView ;")
			finally
				st.close()

		}.failed.foreach{
			err => log.error(err, s"Failed to update materialized view $matView for $envri (periodic background task)")
		}

end PostgisEventWriter