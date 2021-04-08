package se.lu.nateko.cp.data.services.fetch

import akka.NotUsed
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.api.MetaClient.asLiteralOpt
import se.lu.nateko.cp.data.api.MetaClient.asResource
import se.lu.nateko.cp.data.api.SparqlClient
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.staticObjLandingPage
import se.lu.nateko.cp.meta.core.sparql.BoundUri

import java.net.URI
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

class BinTableCsvReader(sparql: SparqlClient)(implicit envriConf: EnvriConfigs, ctxt: ExecutionContext) {

	private type FutureSource =  Future[Source[String, NotUsed]]

	def csvSource(hash: Sha256Sum)(implicit envri: Envri): FutureSource = {
		val dobj = staticObjLandingPage(hash)(envriConf(envri))

		sparql.select(specAndColsQuery(dobj)).flatMap{res =>
			val binding = res.results.bindings.headOption.getOrElse{
				throw new Exception(s"Data object not found: $dobj")
			}
			val spec = asResource(binding, "spec")
			val colNamesOpt = asLiteralOpt(binding, "colNames").map{arrStr =>
				import spray.json._
				import DefaultJsonProtocol._
				arrStr.parseJson.convertTo[Seq[String]]
			}
			fetchSource(hash, spec, colNamesOpt)
		}
	}

	private def fetchSource(hash: Sha256Sum, objSpec: URI, colNames: Option[Seq[String]]): FutureSource = ???

	private def specAndColsQuery(dobj: URI): String = {
		s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select * where {
			|	<$dobj> cpmeta:hasObjectSpec ?spec .
			|	optional{<$dobj> cpmeta:hasActualColumnNames ?colNames }
			|}""".stripMargin
	}
}
