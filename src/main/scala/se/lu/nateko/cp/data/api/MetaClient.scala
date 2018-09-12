package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import akka.Done
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.model._
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ActorMaterializer
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.MetaServiceConfig
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.DataObjectSpec
import se.lu.nateko.cp.meta.core.data.Envri
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.JsonSupport._
import se.lu.nateko.cp.meta.core.data.UploadCompletionInfo
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.meta.core.sparql.BoundLiteral
import spray.json.JsBoolean
import spray.json.JsValue

class MetaClient(config: MetaServiceConfig)(implicit val system: ActorSystem, envriConfs: EnvriConfigs) {
	implicit val dispatcher = system.dispatcher
	implicit val materializer = ActorMaterializer(None, Some("metaClientMat"))
	import config.{ baseUrl, sparqlEndpointPath, uploadApiPath }

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
		envriConfs.get(envri).map(_.metaPrefix.getHost)

	def lookupPackage(hash: Sha256Sum)(implicit envri: Envri): Future[DataObject] = {
		val url = baseUrl + "objects/" + hash.id
		get(url, hostOpt).flatMap(
			extractResult(Unmarshal(_).to[DataObject]){
				case StatusCodes.NotFound => new MetadataObjectNotFound(hash)
			}
		)
	}

	def lookupObjSpec(spec: Uri)(implicit envri: Envri): Future[DataObjectSpec] = get(spec, hostOpt).flatMap{
		extractIfSuccess(Unmarshal(_).to[DataObjectSpec])
	}

	def userIsAllowedUpload(dataObj: DataObject, user: UserId)(implicit envri: Envri): Future[Unit] = {
		val submitter = dataObj.submission.submitter
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

	def registerEtcUpload(meta: EtcUploadMetadata): Future[Done] = {
		import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.etcUploatMetaFormat
		val url = Uri(s"$baseUrl$uploadApiPath/etc")
		post(url, meta, hostOpt(Envri.ICOS)).flatMap(extractIfSuccess{entity =>
			entity.discardBytes()
			Future.successful(Done)
		})
	}

	def completeUpload(hash: Sha256Sum, completionInfo: UploadCompletionInfo)(implicit envri: Envri): Future[String] = {
		val url = config.baseUrl + config.uploadApiPath + "/" + hash.id

		post(url, completionInfo, hostOpt).flatMap(extractIfSuccess(Unmarshal(_).to[String]))
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
			resp.entity.toStrict(3.seconds)            //making sure the response is not chunked
				.map(strict => strict.data.decodeString("UTF-8"))   //extracting the response body as string, to treat is as error message later
				.recover{case _: Throwable => s"Got $status from the metadata server"}  //fallback error message
				.flatMap(msg => Future.failed(new CpDataException(s"Metadata server error: \n$msg")))   //failing with the error message
	}

}
