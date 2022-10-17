package se.lu.nateko.cp.data.api

import akka.NotUsed
import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.headers.{Accept, `Cache-Control`, CacheDirectives}
import akka.http.scaladsl.settings.ConnectionPoolSettings
import akka.http.scaladsl.unmarshalling.Unmarshal
import scala.concurrent.duration.Duration
import scala.concurrent.Future
import scala.collection.immutable.Iterable
import se.lu.nateko.cp.meta.core.sparql.Binding
import se.lu.nateko.cp.meta.core.sparql.SparqlSelectResult
import se.lu.nateko.cp.meta.core.sparql.JsonSupport.given
import java.net.URL
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.Flow
import akka.util.ByteString
import se.lu.nateko.cp.data.formats.TimeSeriesStreams
import se.lu.nateko.cp.data.formats.csv.CsvParser
import scala.util.Try

class SparqlClient(url: URL)(using system: ActorSystem) {
	import SparqlClient._
	import system.dispatcher

	private val sparqlJson = MediaType.custom("application/sparql-results+json", binary = false)
	private val acceptJson = Accept(MediaTypes.`application/json`, sparqlJson)
	private val acceptCsv = Accept(MediaTypes.`text/csv`)
	private val nocache = `Cache-Control`(CacheDirectives.`no-cache`)

	private def httpPost(entity: String, accept: Accept, longRunning: Boolean = false): Future[HttpResponse] = {
		import ConnectionPoolSettings.default

		val connPoolSettings: ConnectionPoolSettings = if(longRunning)
			default
				.withIdleTimeout(Duration.Inf)
				.withResponseEntitySubscriptionTimeout(Duration.Inf)
				.withUpdatedConnectionSettings(_.withIdleTimeout(Duration.Inf))
		else default

		Http().singleRequest(
			HttpRequest(
				method = HttpMethods.POST,
				uri = url.toString,
				headers = accept :: nocache :: Nil,
				entity = entity
			),
			settings = connPoolSettings
		)
	}

	def select(selectQuery: String): Future[SparqlSelectResult] = {
		httpPost(selectQuery, acceptJson).flatMap(
			resp => resp.status match {
				case StatusCodes.OK =>
					val entity = resp.entity.contentType.mediaType match {
						case `sparqlJson` =>
							resp.entity.withContentType(ContentTypes.`application/json`)
						case MediaTypes.`application/json` =>
							resp.entity
						case _ =>
							resp.discardEntityBytes()
							throw new CpDataException(s"SPARQL server responded with Content Type ${resp.entity.contentType}")
					}
					Unmarshal(entity).to[SparqlSelectResult]
				case _ =>
					Utils.responseAsString(resp).flatMap{msg =>
						Future.failed(new CpDataException(s"SPARQL server error: $msg"))
					}
			}
		)
	}

	def selectMap[T](query: String)(f: Binding => Option[T]): Future[IndexedSeq[T]] =
		select(query).map(_.results.bindings.flatMap(f).toIndexedSeq)

	def streamedSelect(selectQuery: String): Future[Source[StrBinding, Any]] =
		httpPost(selectQuery, acceptCsv, longRunning = true)
			.map(_.entity.withoutSizeLimit.dataBytes.via(csvResParser))

	val csvResParser: Flow[ByteString, StrBinding, NotUsed] = TimeSeriesStreams.linesFromUtf8Binary
		.scan(CsvParser.seed)(CsvParser.default.parseLine)
		.collect{
			case acc if acc.lastState == CsvParser.Init => acc.cells
		}
		.scan(scanSeed)(_ next _)
		.mapConcat(_.getBinding)
}

object SparqlClient{
	type StrBinding = Map[String, String]

	private def scanSeed = new CsvResScan(Array.empty, Array.empty)
	private class CsvResScan(varNames: Array[String], values: Array[String]){

		def getBinding: Iterable[StrBinding] =
			if(varNames.length == 0 || values.length != varNames.length) Iterable.empty
			else Iterable(varNames.zip(values).toMap)

		def next(cells: Array[String]) =
			if(varNames.length == 0) new CsvResScan(cells, Array.empty)
			else new CsvResScan(varNames, cells)
	}
}
