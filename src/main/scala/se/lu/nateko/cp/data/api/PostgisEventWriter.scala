package se.lu.nateko.cp.data.api

import akka.Done
import akka.event.LoggingAdapter
import eu.icoscp.envri.Envri
import eu.icoscp.geoipclient.GeoIpInfo
import se.lu.nateko.cp.data.PostgisConfig
import se.lu.nateko.cp.data.services.dlstats.StatsIndex
import se.lu.nateko.cp.data.services.dlstats.StatsIndexEntry
import se.lu.nateko.cp.data.api.IpTest
import se.lu.nateko.cp.meta.core.data.Agent
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.Station
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import java.sql.Types
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import scala.concurrent.Future


class PostgisEventWriter(statsIndices: Map[Envri, Future[StatsIndex]], conf: PostgisConfig, log: LoggingAdapter) extends PostgisClient(conf):

	private val scheduler = Executors.newSingleThreadScheduledExecutor()

	override def close(): Unit =
		super.close()
		scheduler.shutdown()

	def logDownload(dlInfo: DlEventForPostgres, ip: Either[String, GeoIpInfo])(using envri: Envri): Future[Done] = execute(conf.writer){conn =>
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

		val resultSet = st.executeQuery()

		val statsIndex = statsIndices.getOrElse(envri, Future.failed(new CpDataException(s"Postgis Analyzer was not configured for ENVRI $envri")))

		val ipTests: IndexedSeq[IpTest] = conf.grayDownloads.map(gdl => IpTest.parse(gdl.ip)).toIndexedSeq

		dlInfo match
			case dobjDl: DataObjDownloadInfo =>
				for index <- statsIndex do
					resultSet.next()
					val newId = resultSet.getLong(1)
					if newId != -1 then
						val newEntry = StatsIndexEntry(
							newId.toInt,
							Sha256Sum.fromString(dobjDl.hashId).get,
							dobjDl.time,
							dobjDl.dobj.specification.self.uri,
							dobjDl.dobj.specificInfo.fold(_.station, stationSpec => Some(stationSpec.acquisition.station)) match
								case None => None
								case Some(station) => Some(station.org.self.uri)
							,
							dobjDl.dobj.submission.submitter.self.uri,
							(
								dobjDl.dobj.references.authors.toSeq.flatten ++
								dobjDl.dobj.production.toSeq.flatMap: prodInfo =>
									prodInfo.contributors :+ prodInfo.creator
							).map(_.self.uri).distinct.toIndexedSeq,
							ip.fold(ip => None, geo => geo.country_code.flatMap(CountryCode.unapply)),
							!ipTests.forall(!_.test(ip.fold(identity, geo => geo.ip)))
						)
						index.add(newEntry)
					resultSet.close()
					st.close()
			case _ =>
				resultSet.close()
				st.close()
	}

	def writeDobjInfo(dobj: DataObject)(using Envri): Future[Done] = execute(conf.writer){conn =>
		val dobjsQuery = """
					|INSERT INTO dobjs_extended(hash_id, spec, submitter, station, contributors)
					|VALUES (?, ?, ?, ?, ?)
					|ON CONFLICT (hash_id) DO UPDATE
					|	SET spec = EXCLUDED.spec, submitter = EXCLUDED.submitter, station = EXCLUDED.station
					|""".stripMargin

		val dobjsSt = conn.prepareStatement(dobjsQuery)

		try
			val Seq(hash_id, spec, submitter, station, contributors) = 1 to 5

			dobjsSt.setString(hash_id, dobj.hash.id)
			dobjsSt.setString(spec, dobj.specification.self.uri.toString)
			dobjsSt.setString(submitter, dobj.submission.submitter.self.uri.toString)

			val stationOpt: Option[Station] = dobj.specificInfo.fold(_.station, stationSpec => Some(stationSpec.acquisition.station))
			stationOpt match
				case None => dobjsSt.setNull(station, Types.VARCHAR)
				case Some(theStation) => dobjsSt.setString(station, theStation.org.self.uri.toString)

			val contribUris: Array[Object] = (
				dobj.references.authors.toSeq.flatten ++
				dobj.production.toSeq.flatMap(prodInfo =>
					prodInfo.contributors :+ prodInfo.creator
				)
			).map(_.self.uri.toString).distinct.toArray
			val contribsArray = conn.createArrayOf("text", contribUris)
			dobjsSt.setArray(contributors, contribsArray)

			dobjsSt.executeUpdate()

		finally
			dobjsSt.close()
	}

end PostgisEventWriter
