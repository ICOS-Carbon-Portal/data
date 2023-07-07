package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.routes.StatsRouting.*

import java.net.URI
import java.time.Instant
import scala.collection.mutable
import scala.concurrent.Future
import org.roaringbitmap.RoaringBitmap
import org.roaringbitmap.buffer.{MutableRoaringBitmap,ImmutableRoaringBitmap,BufferFastAggregation}

class StatsIndexEntry(
	val dobj: Sha256Sum,
	val dlTime: Instant,
	val objectSpec: URI,
	val station: Option[URI],
	val submitter: URI,
	val contributors: Seq[URI],
	val dlCountry: CountryCode,
)

case class QueryParams(
	pageOpt: Option[Int],
	pagesizeOpt: Option[Int],
	hashId: Option[Sha256Sum],
	objectSpecs: Option[Seq[URI]],
	stations: Option[Seq[URI]],
	contributors: Option[Seq[URI]],
	submitters: Option[Seq[URI]],
	dlCountries: Option[Seq[CountryCode]],
	originStations: Option[Seq[URI]],
	dlStart: Option[Instant],
	dlEnd: Option[Instant]
)

case class Week(year: Int, month: Int, week: Int)
case class Month(year: Int, month: Int)
//case class ListResults(fileName: String, hashId: Sha256Sum, count: Int)
case class DownloadsPerWeek(count: Int, week: Week)
case class DownloadsPerMonth(count: Int, month: Month)
case class DownloadsPerYear(count: Int, year: Int)

case class DownloadsByCountry(count: Int, countryCode: CountryCode)
//case class DownloadsPerWeek(count: Int, ts: Instant, week: Double)
//case class DownloadsPerTimeframe(count: Int, ts: Instant)
case class DownloadObjStat(count: Int, hashId: Sha256Sum)
case class DownloadStats(stats: IndexedSeq[DownloadObjStat], size: Int)
case class Specifications(count: Int, spec: String)
case class Contributors(count: Int, contributor: String)
case class Submitters(count: Int, submitter: String)
case class Stations(count: Int, station: String)
case class DownloadedFrom(count: Int, countryCode: String)
case class DownloadCount(downloadCount: Int)
case class DateCount(date: String, count: Int)
case class PointPosition(`type`: String, coordinates: Tuple2[Double, Double])
case class Download(
	itemType: String,
	ts: Instant,
	hashId: Sha256Sum,
	ip: String,
	city: Option[String],
	countryCode: Option[CountryCode],
	endUser: Option[String],
	geoJson: Option[PointPosition]
)
case class CustomDownloadsPerYearCountry(year: Int, country: String, downloads: Int)

class StatsIndex:
	private var idx: Int = 0

	type BmMap[T] = mutable.Map[T, MutableRoaringBitmap]

	val specIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val stationIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val contributorIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val submitterIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val dlCountryIndices = mutable.Map.empty[CountryCode, MutableRoaringBitmap]
	val dlWeekIndices = mutable.Map.empty[Week, MutableRoaringBitmap]
	val dlMonthIndices = mutable.Map.empty[Month, MutableRoaringBitmap]
	val dlYearIndices = mutable.Map.empty[Int, MutableRoaringBitmap]
	//val dlTimeIndices = mutable.Map.empty[Instant, MutableRoaringBitmap]

	extension [T](bmMap: BmMap[T])
		def setBit(forKey: T): Unit =
			bmMap.getOrElseUpdate(forKey, new MutableRoaringBitmap).add(idx)

	/* Ingest entries from the table obtained by merging the dobjs and downloads data tables from postgis.
	   Add entries one by one to the bitmaps. */
	def initialize() = ???

	def add(entry: StatsIndexEntry): Unit =
		specIndices.setBit(entry.objectSpec)
		for station <- entry.station do
			stationIndices.setBit(station)
		for contributor <- entry.contributors do
			contributorIndices.setBit(contributor)
		submitterIndices.setBit(entry.submitter)
		dlCountryIndices.setBit(entry.dlCountry)
		//val dlTimeBm = dlTimeIndices.getOrElseUpdate(entry.dlTime, new MutableRoaringBitmap)
		//dlTimeBm.add(idx)
		idx += 1

		// Reminder: use MutableRoaringBitmap.runOptimize to make sure that bitmaps are compressed in the end.
	
	def filter(qp: QueryParams): ImmutableRoaringBitmap =
		def multiParamFilter[T](paramOptSeq: Option[Seq[T]], bmMap: BmMap[T]): Option[ImmutableRoaringBitmap] = paramOptSeq.map:
			params => BufferFastAggregation.or(params.flatMap(bmMap.get)*)

		val allStations: Option[Seq[URI]] = (qp.stations, qp.originStations) match
			case (None, None) => None
			case t => Some(t.toList.flatten.flatten.distinct)
	
		val specFilter = multiParamFilter(qp.objectSpecs, specIndices)
		val stationFilter = multiParamFilter(allStations, stationIndices)
		val contributorsFilter = multiParamFilter(qp.contributors, contributorIndices)
		val submitterFilter = multiParamFilter(qp.submitters, submitterIndices)
		val dlCountriesFilter = multiParamFilter(qp.dlCountries, dlCountryIndices)
		//val dlTimesBm = MutableRoaringBitmap.or(qp.dlTime.fold(Nil)(seqBms => seqBms.map(s => dlTimeIndices(s).toImmutableRoaringBitmap()))*)

		val filters = Seq(specFilter, stationFilter, contributorsFilter, submitterFilter, dlCountriesFilter)

		BufferFastAggregation.and(filters.filter(_.nonEmpty).map(_.get)*)

	def combineAndCount(filterBm: ImmutableRoaringBitmap, paramBm: ImmutableRoaringBitmap): Int =
		ImmutableRoaringBitmap.andCardinality(filterBm, paramBm)
		//BufferFastAggregation.and(filterBm, paramBm).getLongCardinality.toInt

	def downloadByCountry(qp: QueryParams): List[DownloadsByCountry] = 
		dlCountryIndices.map((country, countryBm) => DownloadsByCountry(combineAndCount(filter(qp), countryBm), country)).toList

	def downloadsPerWeek(qp: QueryParams): List[DownloadsPerWeek] = 
		dlWeekIndices.map((week, dlWeekBm) => DownloadsPerWeek(combineAndCount(filter(qp), dlWeekBm), week)).toList

	def downloadsPerMonth(qp: QueryParams): List[DownloadsPerMonth] = 
		dlMonthIndices.map((month, dlMonthBm) => DownloadsPerMonth(combineAndCount(filter(qp), dlMonthBm), month)).toList
	
	def downloadsPerYear(qp: QueryParams): List[DownloadsPerYear] = 
		dlYearIndices.map((year, dlYearBm) => DownloadsPerYear(combineAndCount(filter(qp), dlYearBm), year)).toList

	def downloadStats(qp: QueryParams): List[DownloadStats] = ???

	//def downloadCount(hashId: Sha256Sum): List[DownloadCount] = ???

	//def lastDownloads(): List[Download] = ???

	//def specifications(): List[Specifications] = ???
	
	//def contributors(): List[Contributors] = ???

	//def submitters(): List[Submitters] = ???

	//def stations(): List[Stations] = ???

	//def dlfrom() = ???

	//def downloadedCollections() = ???

	//def customDownloadsPerYearCountry() = ???

end StatsIndex
