package se.lu.nateko.cp.data.api

import java.net.URI
import java.net.URLEncoder

class MetaVocab(baseUri: URI) {

	protected val baseUriStr = baseUri.toString

	def getRelative(local: String): URI =
		new URI(baseUriStr + URLEncoder.encode(local, "UTF-8"))

}

object CpMetaVocab extends MetaVocab(new URI("http://meta.icos-cp.eu/ontologies/cpmeta/")){

	def asciiWdcggTimeSer = getRelative("asciiWdcggTimeSer")

}