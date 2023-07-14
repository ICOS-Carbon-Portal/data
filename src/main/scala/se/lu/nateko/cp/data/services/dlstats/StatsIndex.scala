package se.lu.nateko.cp.data.services.dlstats

import eu.icoscp.envri.Envri
//import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
//import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.data.routes.StatsRouting.*

import java.net.URI
import java.time.{Instant,LocalDate,ZoneId}
import java.time.temporal.IsoFields
import scala.collection.mutable
//import scala.concurrent.Future
import org.roaringbitmap.RoaringBitmap
import org.roaringbitmap.buffer.{MutableRoaringBitmap,ImmutableRoaringBitmap,BufferFastAggregation}
import java.util.concurrent.atomic.AtomicInteger
import se.lu.nateko.cp.meta.core.data.CountryCode
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
//import ucar.nc2.ft.point.remote.PointStreamProto.Station

class StatsIndexEntry(
	val dobj: Sha256Sum,
	val dlTime: Instant,
	val objectSpec: URI,
	val station: Option[URI],
	val submitter: URI,
	val contributors: Seq[URI],
	val dlCountry: CountryCode,
	val itemType: DlItemType
)

class StatsIndex(sizeHint: Int):

	type BmMap[T] = mutable.Map[T, MutableRoaringBitmap]

	val specIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val stationIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val contributorIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val submitterIndices = mutable.Map.empty[URI, MutableRoaringBitmap]
	val dlCountryIndices = mutable.Map.empty[CountryCode, MutableRoaringBitmap]
	val dlWeekIndices = mutable.Map.empty[Week, MutableRoaringBitmap]
	val dlMonthIndices = mutable.Map.empty[Month, MutableRoaringBitmap]
	val dlYearIndices = mutable.Map.empty[Int, MutableRoaringBitmap]
	val objects = mutable.HashSet.empty[Sha256Sum]
	val downloadedObjects = new mutable.ArrayBuffer[Sha256Sum](sizeHint)

	extension (bm: ImmutableRoaringBitmap)
		def andCardinality(other: ImmutableRoaringBitmap): Int = ImmutableRoaringBitmap.andCardinality(bm, other)

	extension [T](bmMap: BmMap[T])
		def setBit(forKey: T): Unit =
			bmMap.getOrElseUpdate(forKey, new MutableRoaringBitmap).add(downloadedObjects.length)
	
	extension (t: Instant)
		def getWeek(): Int =
			LocalDate.ofInstant(t, ZoneId.of("UTC")).get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
		def getMonth(): Int =
			LocalDate.ofInstant(t, ZoneId.of("UTC")).getMonthValue
		def getYear(): Int =
			LocalDate.ofInstant(t, ZoneId.of("UTC")).getYear

	// Reminder: use MutableRoaringBitmap.runOptimize to make sure that bitmaps are compressed in the end.

	def add(entry: StatsIndexEntry): Unit =
		specIndices.setBit(entry.objectSpec)
		for station <- entry.station do
			stationIndices.setBit(station)
		for contributor <- entry.contributors do
			contributorIndices.setBit(contributor)
		submitterIndices.setBit(entry.submitter)
		dlCountryIndices.setBit(entry.dlCountry)
		dlWeekIndices.setBit(Week(entry.dlTime.getYear(), entry.dlTime.getWeek()))
		dlMonthIndices.setBit(Month(entry.dlTime.getYear(), entry.dlTime.getMonth()))
		dlYearIndices.setBit(entry.dlTime.getYear())
		val dobjIsNew = objects.add(entry.dobj)
		val dobjInterned = if dobjIsNew then entry.dobj else objects.intersect(Set(entry.dobj)).head
		downloadedObjects += dobjInterned
	
	private def filter(qp: StatsQueryParams): ImmutableRoaringBitmap =
		def multiParamFilter[T](paramOptSeq: Option[Seq[T]], bmMap: BmMap[T]): Option[ImmutableRoaringBitmap] = paramOptSeq.map:
			params => BufferFastAggregation.or(params.flatMap(bmMap.get)*)

		def combineSeq(seq1: Option[Seq[URI]], seq2: Option[Seq[URI]]): Option[Seq[URI]] =
			(seq1, seq2) match
				case (None, None) => None
				case t => Some(t.toList.flatten.flatten.distinct)
			
		val allSpecs = combineSeq(qp.objectSpecs, qp.objectSpecsFromDataLevel)
		val allStations = combineSeq(qp.stations, qp.originStations)

		val specFilter = multiParamFilter(allSpecs, specIndices)
		val stationFilter = multiParamFilter(allStations, stationIndices)
		val contributorsFilter = multiParamFilter(qp.contributors, contributorIndices)
		val submitterFilter = multiParamFilter(qp.submitters, submitterIndices)
		val dlCountriesFilter = multiParamFilter(qp.dlCountries, dlCountryIndices)
		//val dlTimesBm = MutableRoaringBitmap.or(qp.dlTime.fold(Nil)(seqBms => seqBms.map(s => dlTimeIndices(s).toImmutableRoaringBitmap()))*)

		val filters = Seq(specFilter, stationFilter, contributorsFilter, submitterFilter, dlCountriesFilter)
		BufferFastAggregation.and(filters.flatten*)

	def downloadsByCountry(qp: StatsQueryParams): IndexedSeq[DownloadsByCountry] = 
		dlCountryIndices.map((country, countryBm) => DownloadsByCountry(filter(qp).andCardinality(countryBm), country)).toIndexedSeq

	def downloadsPerWeek(qp: StatsQueryParams): IndexedSeq[DownloadsPerWeek] = 
		dlWeekIndices.map((week, dlWeekBm) => DownloadsPerWeek(filter(qp).andCardinality(dlWeekBm), week)).toIndexedSeq

	def downloadsPerMonth(qp: StatsQueryParams): IndexedSeq[DownloadsPerMonth] = 
		dlMonthIndices.map((month, dlMonthBm) => DownloadsPerMonth(filter(qp).andCardinality(dlMonthBm), month)).toIndexedSeq
	
	def downloadsPerYear(qp: StatsQueryParams): IndexedSeq[DownloadsPerYear] = 
		dlYearIndices.map((year, dlYearBm) => DownloadsPerYear(filter(qp).andCardinality(dlYearBm), year)).toIndexedSeq

	def downloadStats(qp: StatsQueryParams): DownloadStats =
		val counts = mutable.Map.empty[Sha256Sum, AtomicInteger]
		filter(qp).forEach: i =>
			val dlHash = downloadedObjects(i)
			val count = counts.getOrElseUpdate(dlHash, AtomicInteger(0))
			count.incrementAndGet()
		val toSkip = qp.page * qp.pagesize
		val statSize = counts.size
		val statsToReturn = counts.toIndexedSeq.sortBy(- _._2.get).drop(toSkip).take(qp.pagesize).map: (hash, count) =>
			DownloadObjStat(count.get, hash)
		DownloadStats(statsToReturn, statSize)

	def specifications(): IndexedSeq[Specifications] =
		specIndices.map((spec, specBm) => Specifications(specBm.getCardinality, spec)).toIndexedSeq
	
	def contributors(): IndexedSeq[Contributors] =
		contributorIndices.map((contributor, contributorBm) => Contributors(contributorBm.getCardinality, contributor)).toIndexedSeq

	def submitters(): IndexedSeq[Submitters] =
		submitterIndices.map((submitter, submitterBm) => Submitters(submitterBm.getCardinality, submitter)).toIndexedSeq

	def stations(): IndexedSeq[Stations] =
		stationIndices.map((station, stationBm) => Stations(stationBm.getCardinality, station)).toIndexedSeq

	def dlfrom(): IndexedSeq[DownloadedFrom] =
		dlCountryIndices.map((dlCountry, dlCountryBm) => DownloadedFrom(dlCountryBm.getCardinality, dlCountry)).toIndexedSeq

	def downloadCount(hashId: Sha256Sum, qp: StatsQueryParams): DownloadCount =
		import scala.jdk.CollectionConverters.IteratorHasAsScala
		val count = filter(qp).iterator().asScala.filter(downloadedObjects(_) == hashId).size
		DownloadCount(count)

end StatsIndex
