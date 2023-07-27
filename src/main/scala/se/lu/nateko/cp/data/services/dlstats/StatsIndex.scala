package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.routes.StatsRouting.*
import se.lu.nateko.cp.meta.core.algo.HierarchicalBitmap
import se.lu.nateko.cp.meta.core.algo.DatetimeHierarchicalBitmap

import java.net.URI
import java.time.{Instant,LocalDate,ZoneId}
import java.time.temporal.IsoFields
import scala.collection.mutable
//import scala.concurrent.Future
import org.roaringbitmap.RoaringBitmap
import org.roaringbitmap.buffer.{MutableRoaringBitmap,ImmutableRoaringBitmap,BufferFastAggregation}
import java.util.concurrent.atomic.AtomicInteger
import scala.collection.mutable.Buffer
import java.time.format.DateTimeFormatter
import akka.http.javadsl.model.headers.Date
//import ucar.nc2.ft.point.remote.PointStreamProto.Station

class StatsIndexEntry(
	val idx: Int,
	val dobj: Sha256Sum,
	val dlTime: Instant,
	val objectSpec: URI,
	val station: Option[URI],
	val submitter: URI,
	val contributors: IndexedSeq[URI],
	val dlCountry: Option[CountryCode]
)

class StatsIndex(sizeHint: Int):

	type BmMap[T] = mutable.Map[T, MutableRoaringBitmap]

	// Measure size of bitmaps using the provided method.
	val specIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val stationIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val contributorIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val submitterIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val dlCountryIndices = mutable.Map.empty[CountryCode, MutableRoaringBitmap]
	val dlWeekIndices = mutable.Map.empty[Week, MutableRoaringBitmap]
	val dlMonthIndices = mutable.Map.empty[Month, MutableRoaringBitmap]
	val dlYearIndices = mutable.Map.empty[Int, MutableRoaringBitmap]
	val downloadedObjects = mutable.ArrayBuffer.fill[Sha256Sum](sizeHint)(null)
	val downloadInstants = mutable.ArrayBuffer.fill[Long](sizeHint)(0)
	var dlTimeIndex = DatetimeHierarchicalBitmap(downloadInstants)
	val emptyFilter = new MutableRoaringBitmap

	def runOptimize(): Unit =
		specIndices.foreach((uri, bm) => bm.runOptimize)
		stationIndices.foreach((uri, bm) => bm.runOptimize)
		contributorIndices.foreach((uri, bm) => bm.runOptimize)
		submitterIndices.foreach((uri, bm) => bm.runOptimize)
		dlCountryIndices.foreach((uri, bm) => bm.runOptimize)
		dlWeekIndices.foreach((uri, bm) => bm.runOptimize)
		dlMonthIndices.foreach((uri, bm) => bm.runOptimize)
		dlYearIndices.foreach((uri, bm) => bm.runOptimize)
		emptyFilter.runOptimize

	def add(entry: StatsIndexEntry)(using Timings): Unit =
		import Timings.time
	
		extension [T](bmMap: BmMap[T])
			inline def setBit(forKey: T): Unit =
				bmMap.getOrElseUpdate(forKey, new MutableRoaringBitmap).add(entry.idx)
		time("specIndices"):
			specIndices.setBit(entry.objectSpec)
		time("stationIndices"):
			entry.station.foreach(s => stationIndices.setBit(s))
		time("contributorIndices"):
			entry.contributors.foreach(c => contributorIndices.setBit(c))
		time("submitterIndices"):
			submitterIndices.setBit(entry.submitter)
		time("dlCountryIndices"):
			entry.dlCountry.foreach(cc => dlCountryIndices.setBit(cc))
		time("dlWeekIndices"):
			dlWeekIndices.setBit(entry.dlTime.getYearWeek)
		time("dlMonthIndices"):
			dlMonthIndices.setBit(entry.dlTime.getYearMonth)
		time("dlYearIndices"):
			dlYearIndices.setBit(entry.dlTime.utcLocalDate.getYear)
		time("dlTimeIndex"):
			dlTimeIndex.add(entry.dlTime.toEpochMilli, entry.idx)
		time("add buffer to downloadedObjects"):
			if downloadedObjects.size < entry.idx then
				val iter = Iterator.fill(entry.idx - downloadedObjects.size + 1000)(null)
				downloadedObjects.appendAll(iter)
		time("add buffer to downloadInstants"):
			if downloadInstants.size < entry.idx then
				val iter = Iterator.fill(entry.idx - downloadInstants.size + 1000)(0L)
				downloadInstants.appendAll(iter)
				dlTimeIndex = DatetimeHierarchicalBitmap(downloadInstants)
		time("insert object id"):
			downloadedObjects.update(entry.idx, entry.dobj)
			downloadInstants.update(entry.idx, entry.dlTime.toEpochMilli)
		emptyFilter.add(entry.idx)

	private def filter(qp: StatsQueryParams): ImmutableRoaringBitmap =
		def multiParamFilter[T](paramOptSeq: Option[Seq[T]], bmMap: BmMap[T]): Option[ImmutableRoaringBitmap] = paramOptSeq.map:
			params => BufferFastAggregation.or(params.flatMap(bmMap.get)*)

		def combineSeq(seq1: Option[Seq[URI]], seq2: Option[Seq[URI]]): Option[Seq[URI]] =
			(seq1, seq2) match
				case (None, None) => None
				case t => Some(t.toList.flatten.flatten.distinct)

		// Query the SQL database for hashsum filtering
		val query = s"SELECT id FROM statIndexEntries WHERE hash_id=${qp.hashId}"
			
		val allStations = combineSeq(qp.stations, qp.originStations)
		val dls = Instant.parse(qp.dlStart.fold("2017-03-10T11:40:00Z")(t => s"${t}T00:00:00Z"))   // Use Instant and change the frontend so that it returns the proper String format
		val dle = qp.dlEnd.map(t => Instant.parse(s"${t}T00:00:00Z")).fold(Instant.now)(identity)  // Use semi-open intervals instead of hard-coding boundaries here

		val specFilter = multiParamFilter(qp.specs, specIndices).getOrElse(emptyFilter)
		val stationFilter = multiParamFilter(allStations, stationIndices).getOrElse(emptyFilter)
		val contributorsFilter = multiParamFilter(qp.contributors, contributorIndices).getOrElse(emptyFilter)
		val submitterFilter = multiParamFilter(qp.submitters, submitterIndices).getOrElse(emptyFilter)
		val dlCountriesFilter = multiParamFilter(qp.dlfrom, dlCountryIndices).getOrElse(emptyFilter)
		val dlTimeMinFilter = HierarchicalBitmap.MinFilter(dls.toEpochMilli, true)
		val dlTimeMaxFilter = HierarchicalBitmap.MaxFilter(dle.toEpochMilli, true)
		val dlTimeIndex = DatetimeHierarchicalBitmap(downloadInstants)
		val dlTimeFilter = dlTimeIndex.filter(HierarchicalBitmap.IntervalFilter(dlTimeMinFilter, dlTimeMaxFilter))

		val filters = Seq(specFilter, stationFilter, contributorsFilter, submitterFilter, dlCountriesFilter, dlTimeFilter)
		//val filter = new MutableRoaringBitmap
		//BufferFastAggregation.and(filters*).forEach: b =>
		//	if downloadedObjects(b) == qp.hashId then
		//		filter.add(b)
		//	else
		//		_
		//filter
		BufferFastAggregation.and(filters*)
		
	def downloadsByCountry(qp: StatsQueryParams): IndexedSeq[DownloadsByCountry] = 
		dlCountryIndices.map((country, countryBm) => DownloadsByCountry(filter(qp).andCardinality(countryBm), country)).toIndexedSeq.filter(_._1 != 0).sortBy(- _._1)

	def downloadsPerYearByCountry(qp: StatsQueryParams): IndexedSeq[CustomDownloadsPerYearCountry] =
		val iterable =
			for
				(year, dlYearBm) <- dlYearIndices
				(country, dlCountryBm) <- dlCountryIndices
			yield
				val filterYearCountry = BufferFastAggregation.and(dlYearBm, dlCountryBm)
				CustomDownloadsPerYearCountry(year, country, filter(qp).andCardinality(filterYearCountry))
		iterable.toIndexedSeq.sortBy(x => (- x._1, - x._3, x._2.toString))

	def downloadsPerWeek(qp: StatsQueryParams): IndexedSeq[DownloadsPerWeek] = 
		dlWeekIndices.map((week, dlWeekBm) => DownloadsPerWeek(filter(qp).andCardinality(dlWeekBm), week.toInstant, week.week)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)

	def downloadsPerMonth(qp: StatsQueryParams): IndexedSeq[DownloadsPerTimeframe] = 
		dlMonthIndices.map((month, dlMonthBm) => DownloadsPerTimeframe(filter(qp).andCardinality(dlMonthBm), month.toInstant)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)
	
	def downloadsPerYear(qp: StatsQueryParams): IndexedSeq[DownloadsPerTimeframe] = 
		dlYearIndices.map((year, dlYearBm) => DownloadsPerTimeframe(filter(qp).andCardinality(dlYearBm), year.yearToInstant)).toIndexedSeq.filter(_._1 != 0).sortBy(_._2)

	def downloadStats(qp: StatsQueryParams): DownloadStats =
		val counts = mutable.Map.empty[Sha256Sum, AtomicInteger]
		filter(qp).forEach: i =>
			val dlHash = downloadedObjects(i)
			val count = counts.getOrElseUpdate(dlHash, AtomicInteger(0))
			count.incrementAndGet()
		val statSize = counts.size
		val toSkip = (qp.page - 1) * qp.pagesize
		val statsToReturn = counts.toIndexedSeq.sortBy(- _._2.get).drop(toSkip).take(qp.pagesize).map: (hash, count) =>
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

	// Not used in PostgisDlAnalyzer
	def downloadCount(hashId: Sha256Sum, qp: StatsQueryParams): DownloadCount =
		import scala.jdk.CollectionConverters.IteratorHasAsScala
		val count = filter(qp).iterator().asScala.filter(downloadedObjects(_) == hashId).size
		DownloadCount(count)

end StatsIndex

extension (bm: ImmutableRoaringBitmap)
	def andCardinality(other: ImmutableRoaringBitmap): Int = ImmutableRoaringBitmap.andCardinality(bm, other)

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