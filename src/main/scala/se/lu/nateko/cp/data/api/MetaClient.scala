package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.collection.immutable
import scala.collection.immutable.Iterable

import akka.Done
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.model._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.http.scaladsl.unmarshalling.FromEntityUnmarshaller
import akka.stream.Materializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.MetaServiceConfig
import se.lu.nateko.cp.data.utils.Akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.JsonSupport._
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.meta.core.sparql._
import spray.json.JsBoolean
import spray.json.JsValue
import spray.json.JsNumber
import spray.json.JsNull
import java.net.URI
import akka.stream.scaladsl.Source
import scala.util.Try

class MetaClient(config: MetaServiceConfig)(implicit val system: ActorSystem, envriConfs: EnvriConfigs) {
	implicit val dispatcher = system.dispatcher
	import config.{ baseUrl, sparqlEndpointPath, uploadApiPath }
	import MetaClient._

	val sparql = new SparqlClient(new java.net.URL(baseUrl + sparqlEndpointPath))
	def log = system.log

	private def get(uri: Uri, host: Option[String]): Future[HttpResponse] = {
		Http().singleRequest(
			HttpRequest(
				uri = uri,
				headers = headers.Accept(MediaTypes.`application/json`) :: host.map(headers.Host(_)).toList
			)
		)
	}

	private def post[T: ToEntityMarshaller](uri: Uri, payload: T, host: Option[String]): Future[HttpResponse] = {
		Marshal(payload).to[RequestEntity].flatMap( entity =>
			Http().singleRequest(
				HttpRequest(uri = uri, method = HttpMethods.POST, entity = entity, headers = host.map(headers.Host(_)).toList)
			)
		)
	}

	private def hostOpt(implicit envri: Envri): Option[String] =
		envriConfs.get(envri).map(_.metaHost)

	def lookupPackage(hash: Sha256Sum)(implicit envri: Envri): Future[StaticObject] =
		lookupItem[StaticObject](hash, objectPathPrefix)

	def lookupCollection(hash: Sha256Sum)(implicit envri: Envri): Future[StaticCollection] =
		lookupItem[StaticCollection](hash, collectionPathPrefix)

	private def lookupItem[T](hash: Sha256Sum, pathPrefix: String)(implicit envri: Envri, unm: FromEntityUnmarshaller[T]): Future[T] = {
		val url = baseUrl + pathPrefix + hash.id
		get(url, hostOpt).flatMap(
			extractResult(Unmarshal(_).to[T]){
				case StatusCodes.NotFound => new MetadataObjectNotFound(hash)
			}
		)
	}

	def lookupObjSpec(spec: Uri)(implicit envri: Envri): Future[DataObjectSpec] = {
		val baseUri = Uri(baseUrl)
		val specUri = spec.withAuthority(baseUri.authority).withScheme(baseUri.scheme)

		get(specUri, hostOpt).flatMap{
			extractIfSuccess(Unmarshal(_).to[DataObjectSpec])
		}
	}

	def userIsAllowedUpload(obj: StaticObject, user: UserId)(implicit envri: Envri): Future[Unit] = {
		val submitter = obj.submission.submitter
		val submitterUri = submitter.self.uri.toString
		val uri = Uri(s"$baseUrl$uploadApiPath/permissions").withQuery(
			Uri.Query("submitter" -> submitterUri, "userId" -> user.email)
		)
		get(uri, hostOpt).flatMap(extractIfSuccess(
			Unmarshal(_).to[JsValue].map(_ match {
				case JsBoolean(b) =>
					if(!b) throw new UnauthorizedUpload({
						val submitterName = submitter.self.label.getOrElse(submitterUri)
						s"User '${user.email}' is not authorized to upload on behalf of $submitterName"
					})
				case js => throw new Exception(s"Expected a JSON boolean, got $js")
			})
		))
	}

	def completeUpload(hash: Sha256Sum, completionInfo: UploadCompletionInfo)(implicit envri: Envri): Future[String] = {
		val url = Uri(s"$baseUrl$uploadApiPath/${hash.id}")

		post(url, completionInfo, hostOpt).flatMap(extractIfSuccess(Unmarshal(_).to[String]))
	}

	def registerEtcUpload(meta: EtcUploadMetadata): Future[Done] = {
		import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.etcUploatMetaFormat
		val url = Uri(s"$baseUrl$uploadApiPath/etc")
		post(url, meta, hostOpt(Envri.ICOS)).flatMap(extractIfSuccess{entity =>
			entity.discardBytes()
			done
		})
	}

	def getUtcOffset(station: StationId): Future[Int] = {
		val url = Uri(s"$baseUrl$uploadApiPath/etc/utcOffset").withQuery(Uri.Query("stationId" -> station.id))
		get(url, None).flatMap(extractIfSuccess(
			Unmarshal(_).to[JsValue].map{
				case JsNull =>
					throw new CpDataException(s"Could not find UTC offset for station ${station.id}")
				case JsNumber(value) =>
					value.intValue
				case js =>
					throw new CpDataException(s"Expected UTC offset to be a number, got $js")
			}
		))
	}

	def getStationsWhereUserIsPi(user: UserId): Future[Seq[StationId]] = {
		val stationVar = "stationId"

		val query = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select ?$stationVar where{
				|?pi cpmeta:hasEmail ?email .
				|FILTER(regex(?email, "${user.email}", "i")) .
				|?pi cpmeta:hasMembership ?memb .
				|?memb cpmeta:hasRole <http://meta.icos-cp.eu/resources/roles/PI> .
				|?memb cpmeta:atOrganization ?station .
				|?station a cpmeta:ES .
				|?station cpmeta:hasStationId ?$stationVar .
			|}""".stripMargin

		sparql.select(query).map{res =>
			res.results.bindings.map(_.get(stationVar)).collect{
				case Some(BoundLiteral(StationId(id), _)) => id
			}
		}
	}

	private def extractIfSuccess[T](extractor: ResponseEntity => Future[T]) = extractResult(extractor)(PartialFunction.empty)

	private def extractResult[T](extractor: ResponseEntity => Future[T])(
		failureHandler: PartialFunction[StatusCode, CpDataException]
	): HttpResponse => Future[T] = resp => {
		import resp.status
		if(status.isSuccess) extractor(resp.entity)
		else
			if(failureHandler.isDefinedAt(status)){
				resp.discardEntityBytes()
				Future.failed(failureHandler(status))
			}
		else
			Utils.responseAsString(resp)
				.flatMap(msg => Future.failed(new CpDataException(s"Metadata server error: \n$msg")))
	}

	def getDobjStorageInfos(paging: Paging = noPaging): Source[DobjStorageInfo, Any] = {
		val PageSize = 1000
		def pageIter(): Iterator[Paging] = paging.limit match{
			case None =>
				Iterator.from(0).map{i =>
					new Paging(paging.offset + i * PageSize, Some(PageSize))
				}
			case Some(limit) =>
				Range(paging.offset, paging.offset + limit).sliding(PageSize, PageSize)
					.map(range => new Paging(range(0), Some(range.size)))
		}
		Source.fromIterator(pageIter)
			.mapAsync(1)(objStorageInfos)
			.takeWhile(!_.isEmpty)
			.mapConcat(identity)
			.filter(dosi => dosi.format != CpMetaVocab.ObjectFormats.asciiWdcggTimeSer)
	}

	private def objStorageInfos(paging: Paging): Future[immutable.Seq[DobjStorageInfo]] = {
		val query = s"""|prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|prefix prov: <http://www.w3.org/ns/prov#>
			|select ?dobj ?format ?size ?fileName where{
			|	{
			|		select * where{
			|			?dobj cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime .
			|			?dobj cpmeta:hasSizeInBytes ?size .
			|			?dobj cpmeta:hasName ?fileName .
			|			?dobj cpmeta:hasObjectSpec ?spec .
			|		}
			|		order by ?submTime
			|		${paging.sparqlClauses}
			|	}
			|	?spec cpmeta:hasFormat ?format .
			|}""".stripMargin

		sparql.select(query).map(
			_.results.bindings.toVector.flatMap{
				binding => Try{
					val size = asLiteral(binding, "size").toLong
					val fileName = asLiteral(binding, "fileName")
					val landingPage = asResource(binding, "dobj")
					val dobjUrlSuff = landingPage.toString.stripSuffix("/").split('/').last
					val hash = Sha256Sum.fromBase64Url(dobjUrlSuff).get
					val format = asResource(binding, "format")
					new DobjStorageInfo(fileName, landingPage, hash, size, format)
				}.toOption
			}
		)
	}
}

object MetaClient{
	class DobjStorageInfo(val fileName: String, val landingPage: URI, val hash: Sha256Sum, val size: Long, val format: URI)
	class Paging(val offset: Int = 0, val limit: Option[Int] = None){
		def sparqlClauses: String = {
			val offClause: Option[String] = if(offset > 0) Some(s"offset $offset") else None
			val limitClause = limit.map("limit " + _.toString)
			Seq(offClause, limitClause).flatten.mkString("\n")
		}
	}

	val noPaging = new Paging()

	def asResource(b: Binding, varName: String): URI = b.get(varName) match{
		case None => throw new Exception(s"Unexpected SPARQL result: no value for $varName")
		case Some(BoundUri(uri)) => uri
		case Some(BoundLiteral(_, _)) => throw new Exception("Unexpected SPARQL result: expected URI resource, got literal")
	}

	def asLiteral(b: Binding, varName: String): String = b.get(varName) match{
		case None => throw new Exception(s"Unexpected SPARQL result: no value for $varName")
		case Some(BoundLiteral(value, _)) => value
		case Some(BoundUri(_)) => throw new Exception("Unexpected SPARQL result: expected literal, got URI resource")
	}
}
