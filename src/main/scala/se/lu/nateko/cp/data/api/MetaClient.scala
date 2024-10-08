package se.lu.nateko.cp.data.api

import akka.Done
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport.*
import akka.http.scaladsl.marshalling.Marshal
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import akka.http.scaladsl.model.*
import akka.http.scaladsl.settings.ConnectionPoolSettings
import akka.http.scaladsl.unmarshalling.FromEntityUnmarshaller
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.scaladsl.Source
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.MetaServiceConfig
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.*
import se.lu.nateko.cp.meta.core.data.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.JsonSupport.given
import se.lu.nateko.cp.meta.core.etcupload.EtcUploadMetadata
import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.given
import se.lu.nateko.cp.meta.core.etcupload.StationId
import se.lu.nateko.cp.meta.core.sparql.*
import spray.json.JsBoolean
import spray.json.JsNull
import spray.json.JsNumber
import spray.json.JsValue

import java.net.URI
import java.time.Instant
import scala.concurrent.ExecutionContextExecutor
import scala.concurrent.Future
import scala.util.Try

class MetaClient(config: MetaServiceConfig)(using val system: ActorSystem, envriConfs: EnvriConfigs):
	implicit val dispatcher: ExecutionContextExecutor = system.dispatcher
	import config.{ baseUrl, sparqlEndpointPath, uploadApiPath }
	import MetaClient._

	val sparql = new SparqlClient(new java.net.URI(baseUrl + sparqlEndpointPath))
	def log = system.log

	private def get(uri: Uri, host: Option[String]): Future[HttpResponse] = {
		Http().singleRequest(
			HttpRequest(
				uri = uri,
				headers = headers.Accept(MediaTypes.`application/json`) :: host.map(headers.Host(_)).toList
			),
			settings = ConnectionPoolSettings(system).withMaxOpenRequests(10000)
		)
	}

	private def post[T: ToEntityMarshaller](uri: Uri, payload: T, host: Option[String]): Future[HttpResponse] = {
		Marshal(payload).to[RequestEntity].flatMap( entity =>
			Http().singleRequest(
				HttpRequest(uri = uri, method = HttpMethods.POST, entity = entity, headers = host.map(headers.Host(_)).toList)
			)
		)
	}

	private def hostOpt(using envri: Envri): Option[String] =
		envriConfs.get(envri).map(_.metaHost)

	def lookupObject(hash: Sha256Sum)(using Envri): Future[StaticObject] =
		lookupItem[StaticObject](hash, objectPathPrefix)

	private def lookupItem[T](hash: Sha256Sum, pathPrefix: String)(using Envri, FromEntityUnmarshaller[T]): Future[T] = {
		val url = baseUrl + pathPrefix + hash.id
		get(url, hostOpt).flatMap(
			extractResult(Unmarshal(_).to[T]){
				case StatusCodes.NotFound => new MetadataObjectNotFound(hash)
			}
		)
	}

	def lookupObjSpec(spec: Uri)(using Envri): Future[DataObjectSpec] = {
		val baseUri = Uri(baseUrl)
		val specUri = spec.withAuthority(baseUri.authority).withScheme(baseUri.scheme)

		get(specUri, hostOpt).flatMap{
			extractIfSuccess(Unmarshal(_).to[DataObjectSpec])
		}
	}

	/**
	  * Looks up lightweight representation for a collection and its descendants (direct and indirect members).
	  * Runs two parallel SPARQL queries.

	  * @param hash the Sha256Sum id of the collection
	  * @return Future with a tuple of PlainStaticCollection and a sequence of PlainStaticItem for the descendants
	  */
	def lookupCollection(hash: Sha256Sum)(using Envri): Future[(PlainStaticCollection, Seq[PlainStaticItem])] =
		withEnvriConfig:
			val collUri = staticCollLandingPage(hash)
			val titleQuery = s"""prefix dcterms: <http://purl.org/dc/terms/>
				|select * where{
				|	<$collUri> dcterms:title ?title
				|}""".stripMargin
			val collFut = sparql.selectMap(titleQuery)(
				_.get("title").collect:
					case BoundLiteral(title, _) => PlainStaticCollection(collUri, hash, title)
			).map(_.head)
			val descendantsQuery = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
				|prefix dcterms: <http://purl.org/dc/terms/>
				|select * where{
				|	<$collUri> dcterms:hasPart+ ?desc .
				|	{
				|		{?desc a cpmeta:DataObject ; cpmeta:hasName ?name} UNION
				|		{?desc a cpmeta:Collection ; dcterms:title ?title}
				|	}
				|}""".stripMargin
			val membersFut = sparql.selectMap(descendantsQuery): binding =>
				val membUri = binding.get("desc").collect{case BoundUri(uri) => uri}.get
				val membHash = Sha256Sum.fromBase64Url(membUri.getPath.split("/").last).get

				binding.get("name")
					.collect:
						case BoundLiteral(name, _) => PlainStaticObject(membUri, membHash, name)
					.orElse:
						binding.get("title").collect:
							case BoundLiteral(title, _) => PlainStaticCollection(membUri, membHash, title)
			collFut.zip(membersFut)
	end lookupCollection

	/**
	 * returns Some(format) for data objects, None for document objects, fails for rest
	*/
	def lookupObjFormat(dobj: Sha256Sum)(using Envri): Future[Option[URI]] = withEnvriConfig{
		val dobjUri = staticObjLandingPage(dobj)
		val query = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select * where{
			|	{<$dobjUri> cpmeta:hasObjectSpec/cpmeta:hasFormat ?format}
			|	UNION
			|	{
			|		<$dobjUri> a cpmeta:DocumentObject .
			|		BIND ("" AS ?format)
			|	}
			|}""".stripMargin

		sparql.selectMap(query)(
			_.get("format").collect{
				case BoundUri(format) => Some(format)
				case BoundLiteral(_, _) => None
			}
		).map(_.headOption.getOrElse(throw new MetadataObjectNotFound(dobj)))
	}

	def userIsAllowedUpload(obj: StaticObject, user: UserId)(using Envri): Future[Unit] = {
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
		import se.lu.nateko.cp.meta.core.etcupload.JsonSupport.given
		val url = Uri(s"$baseUrl$uploadApiPath/etc")
		post(url, meta, hostOpt(using Envri.ICOS)).flatMap(extractIfSuccess{entity =>
			entity.discardBytes()
			done
		})
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
				|filter not exists {?memb cpmeta:hasEndTime []}
				|?station cpmeta:hasStationId ?$stationVar .
			|}""".stripMargin

		sparql.selectMap(query)(
			_.get(stationVar).collect{
				case BoundLiteral(StationId(id), _) => id
			}
		)
	}

	def listLicences(objHashes: Seq[Sha256Sum])(using Envri): Future[Seq[URI]] = withEnvriConfig{
		val query = s"""select distinct ?lic where{
			|	values ?dobj {
			|		${objHashes.map(staticObjLandingPage).mkString("<", ">\n\t\t<", ">")}
			|	}
			|	?dobj <http://purl.org/dc/terms/license> ?lic
			|}""".stripMargin

		sparql.selectMap(query)(
			_.get("lic").collect{ case BoundUri(uri) => uri }
		)
	}

	def withEnvriConfig[T](inner: EnvriConfig ?=> Future[T])(using envri: Envri): Future[T] =
		envriConfs.get(envri).fold(
			dataFail(s"Config not found for ENVRI $envri")
		)(envriConf => inner(using envriConf))

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
					.flatMap(msg => dataFail(s"Metadata server error: \n$msg"))
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
	}

	def getDobjStorageInfos(dobjs: Seq[URI]): Source[DobjStorageInfo, Any] = {
		val query = s"""|prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select * where{
			|	values ?dobj {${dobjs.map{dobj => s"<$dobj>"}.mkString(" ")}}
			|	?dobj cpmeta:hasSizeInBytes ?size .
			|	?dobj cpmeta:hasName ?fileName .
			|	?dobj cpmeta:hasObjectSpec/cpmeta:hasFormat ?format .
			|}""".stripMargin
		Source.lazyFuture(() => sparqlDobjStorageInfos(query)).mapConcat(identity)
	}

	val docObjsStorageInfos: Source[DobjStorageInfo, Any] = {
		val query = """prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select * where{
			|	?dobj a cpmeta:DocumentObject .
			|	?dobj cpmeta:hasName ?fileName .
			|	?dobj cpmeta:hasSizeInBytes ?size .
			|}""".stripMargin
		Source.lazyFuture(() => sparqlDobjStorageInfos(query)).mapConcat(identity)
	}

	private def objStorageInfos(paging: Paging): Future[Seq[DobjStorageInfo]] = {
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
			|	filter(bound(?spec)) #needed due to issue https://github.com/ICOS-Carbon-Portal/meta/issues/105
			|	?spec cpmeta:hasFormat ?format .
			|}""".stripMargin
		sparqlDobjStorageInfos(query)
	}

	private def sparqlDobjStorageInfos(query: String): Future[IndexedSeq[DobjStorageInfo]] =
		sparql.selectMap(query)(binding => Try{
			val size = asLiteral(binding, "size").toLong
			val fileName = asLiteral(binding, "fileName")
			val landingPage = asResource(binding, "dobj")
			val hash = dobjHash(landingPage)
			val format = asResourceOpt(binding, "format")
			DobjStorageInfo(fileName, landingPage, hash, size, format)
		}.toOption)

	def getSameFilenameInfo(fileName: String): Future[IndexedSeq[SameFilenameInfo]] =
		val query = s"""prefix xsd: <http://www.w3.org/2001/XMLSchema#>
			|prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|prefix prov: <http://www.w3.org/ns/prov#>
			|select * where{
			|	?dobj cpmeta:hasName "${fileName}"^^xsd:string ;
			|		cpmeta:wasSubmittedBy/prov:endedAtTime ?submTime ;
			|		cpmeta:hasObjectSpec/cpmeta:hasFormat ?format .
			|	optional{?newDobj cpmeta:isNextVersionOf ?dobj}
			|} order by ?submTime""".stripMargin

		sparql.selectMap(query)(binding => Try{
			val dobj = dobjHash(asResource(binding, "dobj"))
			val submTime = Instant.parse(asLiteral(binding, "submTime"))
			val newV = asResourceOpt(binding, "newDobj").map(dobjHash)
			val format = asResource(binding, "format")
			SameFilenameInfo(dobj, submTime, format, newV)
		}.toOption)

end MetaClient

object MetaClient:
	class DobjStorageInfo(val fileName: String, val landingPage: URI, val hash: Sha256Sum, val size: Long, val format: Option[URI]):
		def isNotStored = format.contains(CpMetaVocab.ObjectFormats.asciiWdcggTimeSer)

	class Paging(val offset: Int = 0, val limit: Option[Int] = None){
		def sparqlClauses: String = {
			val offClause: Option[String] = if(offset > 0) Some(s"offset $offset") else None
			val limitClause = limit.map("limit " + _.toString)
			Seq(offClause, limitClause).flatten.mkString("\n")
		}
		def fileNamePart: String = if(offset != 0 || limit.isDefined) s"$offset--${limit.fold("end")(_.toString)}" else "all"
	}

	val noPaging = new Paging()

	class SameFilenameInfo(val hash: Sha256Sum, val submissionEnd: Instant, val format: URI, val nextVersion: Option[Sha256Sum])

	def asResource(b: Binding, varName: String): URI = asResourceOpt(b, varName).getOrElse(
		throw new Exception(s"Unexpected SPARQL result: no value for $varName")
	)

	def asResourceOpt(b: Binding, varName: String): Option[URI] = b.get(varName) match{
		case None => None
		case Some(BoundUri(uri)) => Some(uri)
		case Some(BoundLiteral(_, _)) => throw new Exception("Unexpected SPARQL result: expected URI resource, got literal")
	}

	def asLiteral(b: Binding, varName: String): String = asLiteralOpt(b, varName).getOrElse{
		throw new Exception(s"Unexpected SPARQL result: no value for $varName")
	}

	def asLiteralOpt(b: Binding, varName: String): Option[String] = b.get(varName) match{
		case None => None
		case Some(BoundLiteral(value, _)) => Some(value)
		case Some(BoundUri(_)) => throw new Exception(s"Unexpected SPARQL result: expected literal in $varName, got URI resource")
	}

	def dobjHash(uri: URI): Sha256Sum =
		val hashStr = uri.toString.stripSuffix("/").split('/').last
		Sha256Sum.fromBase64Url(hashStr).get

end MetaClient
