package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._

import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.directives.Credentials._
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import scala.concurrent.Future
import akka.Done
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.streams.KeepFuture
import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import scala.concurrent.Promise
import akka.NotUsed

object EtcUploadRouting {

	val FAILURE_LIMIT: Int = 1000

	def apply()(implicit mat: Materializer): Route = (put & pathPrefix("upload" / "etc")){
		import mat.executionContext

		authenticateBasic("Carbon Portal", authenticator){user =>

			pathPrefix(Md5Segment){ md5 =>

				path(Segment){ fileName =>

					extractRequest{ req =>
						val md5Fut = req.entity.dataBytes.runWith(dataMd5Sink)
						onSuccess(md5Fut){gotMd5 =>
							if(md5 == gotMd5)
								complete(StatusCodes.OK)
							else
								complete((StatusCodes.BadRequest, "Checksum failure!"))
						}
					}

				} ~
				complete((StatusCodes.BadRequest, "Expected single URL segment with file name after the MD5 segment"))

			} ~
			complete((StatusCodes.BadRequest, "Expected hex-encoded MD5 sum as URL segment after 'upload/etc'"))
		}
	}

	private val Md5Segment = Segment.flatMap(Md5Sum.fromHex(_).toOption)

	private val authenticator: Authenticator[String] = {
		case Missing => None
		case creds @ Provided("station") => if(creds.verify("p4ssw0rd")) Some(creds.identifier) else None
		case _ => None
	}

	private val goodSink: Sink[ByteString, Future[Any]] = Sink.ignore

	private val failingSink: Sink[ByteString, Future[Any]] = Sink.fold(0){(sum, bs) =>
		val newSum = sum + bs.length
		if(newSum < FAILURE_LIMIT) newSum
		else throw new CpDataException("It's a drill! Simulated server error!")
	}

	private val neverFutureSink: Sink[ByteString, Future[Any]] = goodSink.mapMaterializedValue { _ =>
		Promise[Done]().future
	}

	private val goodFlow: Flow[ByteString, ByteString, NotUsed] = Flow.apply[ByteString]

	private val cancellingFlow: Flow[ByteString, ByteString, NotUsed] = {
		val byteCountingFlow = goodFlow.scan((0, ByteString.empty)){
			(sumAndPrev, next) => (sumAndPrev._1 + next.length, next)
		}
		byteCountingFlow.takeWhile(_._1 < FAILURE_LIMIT).map(_._2)
	}

	private val scramblingFlow = goodFlow.map(bs => bs ++ ByteString("bebe"))

	private def dataMd5Sink(implicit ctxt: ExecutionContext) = {
		val rnd = scala.util.Random.nextFloat()

		val (flow, sink) =
			if(rnd < 0.2) (goodFlow, goodSink)
			else if(rnd < 0.4) (goodFlow, failingSink)
			else if(rnd < 0.6) (cancellingFlow, goodSink)
			else if(rnd < 0.8) (scramblingFlow, goodSink)
			else (goodFlow, neverFutureSink)

		flow.viaMat(DigestFlow.md5)(Keep.right).toMat(sink)(KeepFuture.left)
	}
}
