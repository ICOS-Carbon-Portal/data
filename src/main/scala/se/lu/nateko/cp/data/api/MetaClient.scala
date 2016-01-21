package se.lu.nateko.cp.data.api

import java.net.URI
import scala.concurrent.Future
import se.lu.nateko.cp.cpauth.core.UserInfo
import akka.actor.ActorSystem
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.sparql._
import java.time.Instant


class MetaClient(sparql: SparqlClient)(implicit system: ActorSystem) {
	import system.dispatcher

	def lookupPackage(packageUri: URI): Future[DataPackage] = {
		val query = s"""
		PREFIX cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		select ?format ?encoding ?dataLevel ?submitter
		from <http://meta.icos-cp.eu/ontologies/cpmeta/uploads/>
		from <http://meta.icos-cp.eu/ontologies/cpmeta/instances/>
		where{
			<$packageUri> cpmeta:hasPackageSpec ?packageSpec .
			<$packageUri> cpmeta:wasSubmittedBy ?submission .

			?packageSpec cpmeta:hasFormat ?format .
			?packageSpec cpmeta:hasEncoding ?encoding .
			?packageSpec cpmeta:hasDataLevel ?dataLevel .

			?submission ?cpmeta:wasAssociatedWith ?submitter
		}"""
		sparql.select(query).map(parsePackageInfo)
	}

	def userIsAllowedUpload(submittingOrg: URI, user: UserInfo): Future[Boolean] = {
		???
	}

	private def parsePackageInfo(sparqlRes: SparqlSelectResult): DataPackage = {
		val bindings = sparqlRes.results.bindings
		assert(bindings.length == 1, "Expecting a one-row answer to the DataPackage query")

		val Seq(formatVar, encodingVar, dataLevelVar, submitterVar) = sparqlRes.head.vars

		val sol = bindings.head

		val submissionOpt = for(
			BoundUri(uri) <- sol.get(submitterVar)
			//TODO Add fetching the submission start/stop instants
		) yield PackageSubmission(UriResource(uri, None), Instant.now, None)

		val submission = submissionOpt.getOrElse{
			throw new Error("Expected submitter to be specified and be an RDF Resource")
		}

		val packageSpecOpt = for(
			BoundUri(format) <- sol.get(formatVar);
			BoundUri(encoding) <- sol.get(encodingVar);
			BoundLiteral(dataLevel, Some(dtype)) <- sol.get(dataLevelVar) if(dtype.getFragment == "integer")
		) yield DataPackageSpec(format, encoding, dataLevel.toInt)

		val packageSpec = packageSpecOpt.getOrElse{
			throw new Exception("Expected format and encoding URIs and dataLevel Int to be present on Package Spec")
		}
		//TODO Complete with hash and production info
		DataPackage(null, null, submission, packageSpec)
	}
}
