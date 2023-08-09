package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.routes.StatsRouting.*
import se.lu.nateko.cp.data.utils.data.BufferWithDefault
import se.lu.nateko.cp.meta.core.algo.HierarchicalBitmap
import se.lu.nateko.cp.meta.core.algo.DatetimeHierarchicalBitmap

import java.net.URI
import java.time.{Instant,LocalDate,ZoneId}
import java.time.temporal.IsoFields
import scala.collection.mutable
import org.roaringbitmap.RoaringBitmap
import org.roaringbitmap.buffer.{MutableRoaringBitmap,ImmutableRoaringBitmap,BufferFastAggregation}
import java.util.concurrent.atomic.AtomicInteger
import scala.collection.mutable.Buffer
import java.time.format.DateTimeFormatter
import akka.http.javadsl.model.headers.Date

class StatsIndexEntry(
	val idx: Int,
	val dobj: Sha256Sum,
	val dlTime: Instant,
	val objectSpec: URI,
	val station: Option[URI],
	val submitter: URI,
	val contributors: IndexedSeq[URI],
	val dlCountry: Option[CountryCode],
	val ip: String
)

case class StatsQuery(
	page: Int,
	pageSize: Int,
	dlEventIds: Option[Array[Int]],
	specs: Option[Seq[URI]],
	stations: Option[Seq[URI]],
	contributors: Option[Seq[URI]],
	submitters: Option[Seq[URI]],
	dlfrom: Option[Seq[CountryCode]],
	originStations: Option[Seq[URI]],
	dlStart: Option[Instant],
	dlEnd: Option[Instant],
	includeGrayDl: Option[Boolean]
)

class StatsIndex(sizeHint: Int, ipsGrayDownloads: Seq[String]):

	type BmMap[T] = mutable.Map[T, MutableRoaringBitmap]

	val specIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val stationIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val contributorIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val submitterIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val dlCountryIndices = mutable.Map.empty[CountryCode, MutableRoaringBitmap]
	val dlWeekIndices = mutable.Map.empty[Week, MutableRoaringBitmap]
	val dlMonthIndices = mutable.Map.empty[Month, MutableRoaringBitmap]
	val dlYearIndices = mutable.Map.empty[Int, MutableRoaringBitmap]
	val downloadedObjects = BufferWithDefault[Sha256Sum](sizeHint, null)
	val downloadInstants = BufferWithDefault[Long](sizeHint, -1L)
	val dlTimeIndex = DatetimeHierarchicalBitmap(downloadInstants.apply)
	val isWhiteDownload = new MutableRoaringBitmap
	val allDownloads = new MutableRoaringBitmap

	def runOptimize(): Unit =
		specIndices.foreach((uri, bm) => bm.runOptimize())
		stationIndices.foreach((uri, bm) => bm.runOptimize())
		contributorIndices.foreach((uri, bm) => bm.runOptimize())
		submitterIndices.foreach((uri, bm) => bm.runOptimize())
		dlCountryIndices.foreach((uri, bm) => bm.runOptimize())
		dlWeekIndices.foreach((uri, bm) => bm.runOptimize())
		dlMonthIndices.foreach((uri, bm) => bm.runOptimize())
		dlYearIndices.foreach((uri, bm) => bm.runOptimize())
		isWhiteDownload.runOptimize()
		allDownloads.runOptimize()

	def add(entry: StatsIndexEntry)(using Timings): Unit =
		import Timings.time
	
		extension [T](bmMap: BmMap[T])
			inline def setBit(forKey: T): Unit =
				bmMap.getOrElseUpdate(forKey, new MutableRoaringBitmap).add(entry.idx)
		specIndices.setBit(entry.objectSpec)
		entry.station.foreach(s => stationIndices.setBit(s))
		entry.contributors.foreach(c => contributorIndices.setBit(c))
		submitterIndices.setBit(entry.submitter)
		entry.dlCountry.foreach(cc => dlCountryIndices.setBit(cc))
		dlWeekIndices.setBit(entry.dlTime.getYearWeek)
		dlMonthIndices.setBit(entry.dlTime.getYearMonth)
		dlYearIndices.setBit(entry.dlTime.utcLocalDate.getYear)
		dlTimeIndex.add(entry.dlTime.toEpochMilli, entry.idx)
		downloadedObjects.update(entry.idx, entry.dobj)
		downloadInstants.update(entry.idx, entry.dlTime.toEpochMilli)
		ipsGrayDownloads.find(_ == entry.ip).fold(isWhiteDownload.add(entry.idx))(_ => None)
		allDownloads.add(entry.idx)

	/**
	  * Does not handle the single-object filtering. That one is left to the client code.
	  *
	  * @param qp
	  * @return
	  */
	private def filter(qp: StatsQuery): Option[ImmutableRoaringBitmap] =

		def multiParamFilter[T](paramOptSeq: Option[Seq[T]], bmMap: BmMap[T]): Option[ImmutableRoaringBitmap] = paramOptSeq.map:
			params => BufferFastAggregation.or(params.flatMap(bmMap.get)*)

		def combineSeq(seq1: Option[Seq[URI]], seq2: Option[Seq[URI]]): Option[Seq[URI]] =
			(seq1, seq2) match
				case (None, None) => None
				case t => Some(t.toList.flatten.flatten.distinct)

		val allStations = combineSeq(qp.stations, qp.originStations)

		val specFilter = multiParamFilter(qp.specs, specIndices)
		val stationFilter = multiParamFilter(allStations, stationIndices)
		val contributorsFilter = multiParamFilter(qp.contributors, contributorIndices)
		val submitterFilter = multiParamFilter(qp.submitters, submitterIndices)
		val dlCountriesFilter = multiParamFilter(qp.dlfrom, dlCountryIndices)

		import HierarchicalBitmap.{MinFilter, MaxFilter, IntervalFilter, FilterRequest}

		val dlMin = qp.dlStart.map(t => MinFilter(t.toEpochMilli, true))
		val dlMax = qp.dlEnd.map(t => MaxFilter(t.toEpochMilli, true))

		val dlTimeFilterReq: Option[FilterRequest[Long]] = (dlMin, dlMax) match
			case (Some(min), Some(max)) => Some(IntervalFilter(min, max))
			case (None, None) => None
			case (Some(min), None) => Some(min)
			case (None, Some(max)) => Some(max)

		val dlTimeFilter = dlTimeFilterReq.map(dlTimeIndex.filter)
		val dlEventsFilter = qp.dlEventIds.map: eventIds =>
			val bm = new MutableRoaringBitmap()
			bm.addN(eventIds, 0, eventIds.length)
			bm

		val filters =
			val includeGrayDl = qp.includeGrayDl.getOrElse(false)     // By default, do not include gray downloads.
			if includeGrayDl then
				Seq(specFilter, stationFilter, contributorsFilter, submitterFilter, dlCountriesFilter, dlTimeFilter, dlEventsFilter).flatten
			else
				Seq(specFilter, stationFilter, contributorsFilter, submitterFilter, dlCountriesFilter, dlTimeFilter, dlEventsFilter, Some(isWhiteDownload)).flatten
		if filters.isEmpty then None else Some(BufferFastAggregation.and(filters*))
	end filter

	def downloadsByCountry(qp: StatsQuery): IndexedSeq[DownloadsByCountry] =
		dlCountryIndices.map((country, countryBm) => DownloadsByCountry(filter(qp).andCardinality(countryBm), country)).toIndexedSeq.filter(_._1 != 0).sortBy(- _._1)

	def downloadsPerYearByCountry(qp: StatsQuery): IndexedSeq[CustomDownloadsPerYearCountry] =
		val iterable =
			for
				(year, dlYearBm) <- dlYearIndices
				(country, dlCountryBm) <- dlCountryIndices
			yield
				val filterYearCountry = BufferFastAggregation.and(dlYearBm, dlCountryBm)
				CustomDownloadsPerYearCountry(year, country, filter(qp).andCardinality(filterYearCountry))
		iterable.toIndexedSeq.sortBy(x => (- x._1, - x._3, x._2.toString))

	def downloadsPerWeek(qp: StatsQuery): IndexedSeq[DownloadsPerWeek] =
		dlWeekIndices.map((week, dlWeekBm) => DownloadsPerWeek(filter(qp).andCardinality(dlWeekBm), week.toInstant, week.week)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)

	def downloadsPerMonth(qp: StatsQuery): IndexedSeq[DownloadsPerTimeframe] =
		dlMonthIndices.map((month, dlMonthBm) => DownloadsPerTimeframe(filter(qp).andCardinality(dlMonthBm), month.toInstant)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)
	
	def downloadsPerYear(qp: StatsQuery): IndexedSeq[DownloadsPerTimeframe] =
		dlYearIndices.map((year, dlYearBm) => DownloadsPerTimeframe(filter(qp).andCardinality(dlYearBm), year.yearToInstant)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)

	def downloadStats(qp: StatsQuery): DownloadStats =
		val counts = mutable.Map.empty[Sha256Sum, AtomicInteger]
		filter(qp).getOrElse(allDownloads).forEach: i =>
			val dlHash = downloadedObjects(i)
			val count = counts.getOrElseUpdate(dlHash, AtomicInteger(0))
			count.incrementAndGet()
		val statSize = counts.size
		val toSkip = (qp.page - 1) * qp.pageSize
		val statsToReturn = counts.toIndexedSeq.sortBy(- _._2.get).drop(toSkip).take(qp.pageSize).map: (hash, count) =>
			DownloadObjStat(count.get, hash)
		DownloadStats(statsToReturn, statSize)

	def specifications(): IndexedSeq[Specifications] =
		specIndices.map((spec, specBm) => Specifications(specBm.getCardinality, spec)).toIndexedSeq.sortBy(- _._1)
	
	def contributors(): IndexedSeq[Contributors] =
		contributorIndices.map((contributor, contributorBm) => Contributors(contributorBm.getCardinality, contributor)).toIndexedSeq.sortBy(- _._1)

	def submitters(): IndexedSeq[Submitters] =
		submitterIndices.map((submitter, submitterBm) => Submitters(submitterBm.getCardinality, submitter)).toIndexedSeq.sortBy(- _._1)

	def stations(): IndexedSeq[Stations] =
		stationIndices.map((station, stationBm) => Stations(stationBm.getCardinality, station)).toIndexedSeq.sortBy(- _._1)

	def dlfrom(): IndexedSeq[DownloadedFrom] =
		dlCountryIndices.map((dlCountry, dlCountryBm) => DownloadedFrom(dlCountryBm.getCardinality, dlCountry)).toIndexedSeq.sortBy(- _._1)

	def downloadCount(qp: StatsQuery): DownloadCount =
		val count = filter(qp).getOrElse(allDownloads).getCardinality
		DownloadCount(count)

end StatsIndex

extension (bmOpt: Option[ImmutableRoaringBitmap])
	def andCardinality(other: ImmutableRoaringBitmap): Int =
		bmOpt.fold(other.getCardinality)(ImmutableRoaringBitmap.andCardinality(_, other))

extension (t: Instant)
	def utcLocalDate = LocalDate.ofInstant(t, ZoneId.of("UTC"))
	def getYearWeek =
		val ld = t.utcLocalDate
		Week(ld.get(IsoFields.WEEK_BASED_YEAR), ld.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR))
	def getYearMonth =
		val ld = t.utcLocalDate
		Month(ld.getYear, ld.getMonthValue)

extension (w: Week)
	def toInstant =
		val week = "%02d".format(w.week)
		val ld = LocalDate.parse(s"${w.year}-W$week-1", DateTimeFormatter.ISO_WEEK_DATE)
		ld.atStartOfDay(ZoneId.of("UTC")).toInstant

extension (m: Month)
	def toInstant =
		val month = "%02d".format(m.month)
		Instant.parse(s"${m.year}-${month}-01T00:00:00.00Z")

extension (y: Int)
	def yearToInstant =
		Instant.parse(s"$y-01-01T00:00:00.00Z")

type Timings = mutable.Map[String, Buffer[Long]]

object Timings:
	def empty = mutable.Map.empty[String, Buffer[Long]]
	def merge(t1: Timings, t2: Timings): Timings = mutable.Map(
		(t1.keySet ++ t2.keySet).toSeq.map{ k =>
			k -> (t1.getOrElse(k, Buffer.empty) ++ t2.getOrElse(k, Buffer.empty))
		}*
	)

	def time[T](name: String)(work: => T)(using times: Timings): T =
		val start = System.nanoTime()
		val res = work
		val elapsed = System.nanoTime() - start
		times.getOrElseUpdate(name, Buffer.empty).append(elapsed)
		res

	extension(t: Timings)
		def average: Map[String, Long] = t.view.mapValues(b => b.sum / b.size).toMap