package se.lu.nateko.cp.data.test

import scala.io.Source
import scala.util.Using
import java.nio.file.Files
import java.nio.file.Paths
import java.nio.file.{StandardOpenOption => SOO}

/**
  * SPARQL query producing the input to this "script":

prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
prefix prov: <http://www.w3.org/ns/prov#>
prefix xsd: <http://www.w3.org/2001/XMLSchema#>
select ?spec ?station ?dobj ?hasNextVersion ?prevVersion ?fileName ?submTime
where {
	VALUES ?spec {<http://meta.icos-cp.eu/resources/cpmeta/etcNrtAuxData> <http://meta.icos-cp.eu/resources/cpmeta/etcNrtFluxes> <http://meta.icos-cp.eu/resources/cpmeta/etcNrtMeteosens> <http://meta.icos-cp.eu/resources/cpmeta/etcNrtMeteo>}
	?dobj cpmeta:hasObjectSpec ?spec .
	?dobj cpmeta:hasSizeInBytes ?size .
	?dobj cpmeta:hasName ?fileName .
	?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
	?dobj cpmeta:wasAcquiredBy / prov:wasAssociatedWith ?station .
	FILTER( ?submTime >= '2023-11-01T23:00:00.000Z'^^xsd:dateTime )
	BIND(EXISTS{[] cpmeta:isNextVersionOf ?dobj} AS ?hasNextVersion)
	OPTIONAL{?dobj cpmeta:isNextVersionOf ?prevVersion}
}
order by ?spec ?station ?submTime

*/

object EtcNrtDeprs:
	type InputRow = Map[String, String]
	type Deprecation = (String, String)

	val folder = "/home/oleg/Documents/CP/metadata/etcNrts/"
	val inputInfoPath = folder + "sparql_out_after_upd.csv"
	val baddiesPath = folder + "bad_out.txt"
	val missingsPath = folder + "missing_out.txt"

	def writeOut(): Unit =
		exportDeprecations(baddiesPath, badDeprecations)
		exportDeprecations(missingsPath, missingDeprecations)

	def inputDicts =
		Using(Source.fromFile(inputInfoPath)): src =>
			val lines = src.getLines()
			val head = lines.next().split(',')
			lines.map: line =>
				head.zip(line.split(',')).toMap
			.toIndexedSeq
		.get

	extension(m: InputRow)
		def spec = m("spec")
		def station = m("station")
		def dobj = m("dobj")
		def hasNextVersion = m("hasNextVersion").toBoolean
		def prevVersion = m.get("prevVersion").filterNot(_.isBlank)
		def fileName = m("fileName")
		def submTime = m("submTime")

	def exportDeprecations(filePath: String, perSpecStation: IndexedSeq[InputRow] => Iterator[Deprecation]): Unit =
		val txt = inputDicts
			//.filterNot(_.spec.endsWith("AuxData"))
			.groupBy(d => d.spec -> d.station)
			.values
			.map(_.sortBy(_.submTime))
			.flatMap: cands =>
				if cands.size < 2 then Iterator.empty
				else perSpecStation(cands)
			.map: (from, to) =>
				s"<$from> cpmeta:isNextVersionOf <$to> ."
			.toSeq
			.mkString("\n")
		Files.writeString(Paths.get(filePath), txt, SOO.TRUNCATE_EXISTING, SOO.CREATE)


	def badDeprecations(cands: IndexedSeq[InputRow]): Iterator[Deprecation] =
		cands.sliding(2, 1).flatMap: pair =>
			pair(1).prevVersion.collect:
				case prev if prev != pair(0).dobj => pair(1).dobj -> prev

	def missingDeprecations(cands: IndexedSeq[InputRow]): Iterator[Deprecation] =
		cands.sliding(2, 1).flatMap: pair =>
			val expected = Some(pair(1).dobj -> pair(0).dobj)
			pair(1).prevVersion match
				case None => expected
				case Some(prev) if prev != pair(0).dobj => expected
				case _ => None
