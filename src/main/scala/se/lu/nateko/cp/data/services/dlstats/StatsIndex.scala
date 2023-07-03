package se.lu.nateko.cp.data.services.dlstats

import org.roaringbitmap.buffer.MutableRoaringBitmap
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.CountryCode

import java.net.URI
import java.time.Instant
import scala.collection.mutable

class StatsIndexEntry(
	val dobj: Sha256Sum,
	val downloadTime: Instant,
	val objectSpec: URI,
	val station: Option[URI],
	val submitter: URI,
	val contributors: Seq[URI],
	val downloadCountry: CountryCode,
	val originCountry: CountryCode
)

class StatsIndex:
	private var idx: Int = 0

	val specIndices = mutable.Map.empty[URI, MutableRoaringBitmap]

	def add(entry: StatsIndexEntry): Unit =
		val specBm = specIndices.getOrElseUpdate(entry.objectSpec, new MutableRoaringBitmap)
		specBm.add(idx)
		idx += 1

end StatsIndex
