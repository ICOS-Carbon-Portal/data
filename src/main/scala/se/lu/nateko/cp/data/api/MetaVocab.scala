package se.lu.nateko.cp.data.api

import java.net.URI
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

abstract class MetaVocab(baseUri: URI) {

	def getRelative(local: String): URI =
		new URI(baseUri.getScheme, baseUri.getAuthority, baseUri.getPath + local, null, null)

}

object CpMetaVocab extends MetaVocab(new URI("http://meta.icos-cp.eu/ontologies/cpmeta/")){

	val asciiWdcggTimeSer = getRelative("asciiWdcggTimeSer")
	val asciiEtcTimeSer = getRelative("asciiEtcTimeSer")

	def getDataObject(hash: Sha256Sum) = new URI("https://meta.icos-cp.eu/objects/" + hash.id)

	val float32 = getRelative("float32")
	val int32 = getRelative("int32")
	val string = getRelative("string")
	val iso8601date = getRelative("iso8601date")
	val etcDate = getRelative("etcDate")
	val iso8601dateTime = getRelative("iso8601dateTime")
	val iso8601timeOfDay = getRelative("iso8601timeOfDay")
}