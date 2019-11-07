package se.lu.nateko.cp.data.api

import java.net.URI

import se.lu.nateko.cp.meta.core.data.EnvriConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

abstract class MetaVocab(baseUri: URI) {

	def getRelative(local: String): URI =
		new URI(baseUri.getScheme, baseUri.getAuthority, baseUri.getPath + local, null, null)

}

object CpMetaVocab extends MetaVocab(new URI("http://meta.icos-cp.eu/ontologies/cpmeta/")){

	object ObjectFormats{
		val asciiWdcggTimeSer = getRelative("asciiWdcggTimeSer")
		val asciiEtcTimeSer = getRelative("asciiEtcTimeSer")
		val asciiAtcProdTimeSer = getRelative("asciiAtcProductTimeSer")
		val asciiEtcHalfHourlyProdTimeSer = getRelative("asciiEtcHalfHourlyProductTimeSer")
		val asciiOtcSocatTimeSer = getRelative("asciiOtcSocatTimeSer")
		val asciiOtcProductCsv = getRelative("asciiOtcProductCsv")
	}

	def getDataObject(hash: Sha256Sum)(implicit envri: EnvriConfig) =
		new URI(s"${envri.metaPrefix}objects/${hash.id}")

	val float32 = getRelative("float32")
	val float64 = getRelative("float64")
	val int32 = getRelative("int32")
	val bmpChar = getRelative("bmpChar")
	val string = getRelative("string")
	val iso8601date = getRelative("iso8601date")
	val etcDate = getRelative("etcDate")
	val iso8601dateTime = getRelative("iso8601dateTime")
	val iso8601timeOfDay = getRelative("iso8601timeOfDay")
	val isoLikeLocalDateTime = getRelative("isoLikeLocalDateTime")
	val etcLocalDateTime = getRelative("etcLocalDateTime")

	val zipEncoding = getRelative("zipEncoding")
	val plainFile = getRelative("plainFileEncoding")
}

object SitesMetaVocab extends MetaVocab(new URI("https://meta.fieldsites.se/ontologies/sites/")) {

	val simpleSitesCsvTimeSer = getRelative("simpleSitesCsv")
	val dailySitesCsvTimeSer = getRelative("dailySitesCsv")
	val sitesDelimitedHeaderCsvTimeSer = getRelative("delimitedHeaderCsv")
	val sitesDailyDelimitedHeaderCsvTimeSer = getRelative("dailyDelimitedHeaderCsv")
}
