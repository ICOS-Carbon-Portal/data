package se.lu.nateko.cp.data.services.upload

import akka.actor.Scheduler
import akka.Done
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import eu.icoscp.envri.Envri
import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.data.api.B2SafeItem
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.IrodsColl
import se.lu.nateko.cp.data.api.IrodsData
import se.lu.nateko.cp.data.utils.akka.done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.StaticObject

import java.net.URI
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import se.lu.nateko.cp.data.api.IRODSClient

class IrodsUploadTask private (
	hash: Sha256Sum,
	irodsData: IrodsData,
	client: IRODSClient
)(using ExecutionContext, Scheduler) extends UploadTask:

	private val existsFut: Future[Boolean] = client.getHashsumOpt(irodsData).flatMap:
		case Some(`hash`) => Future.successful(true)
		case _ => client.create(irodsData.parent, true).map(_ => false)


	def sink: Sink[ByteString, Future[UploadTaskResult]] = 
		val sinkFut: Future[Sink[ByteString, Future[UploadTaskResult]]] = existsFut.map:
			case true => Sink.cancelled.mapMaterializedValue:
					_ => Future.successful(B2SafeSuccess)

			case false =>
				client.objectSink(irodsData).mapMaterializedValue:
					_.flatMap(_ => checkHashsum()).map: resHash =>
						if(resHash == hash) B2SafeSuccess
						else B2SafeFailure(hashError(resHash))

		Sink.lazyFutureSink(() => sinkFut).mapMaterializedValue:
			_.flatten.recover:
				case err => B2SafeFailure(err)

	private def checkHashsum(): Future[Sha256Sum] = akka.pattern.retry(
		() => client.getHashsum(irodsData), 5, 500.milliseconds
	)

	private def hashError(actual: Sha256Sum) = new CpDataException(s"IRODS returned SHA256 $actual instead of $hash")

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		existsFut
			.flatMap:
				case true =>
					UploadTask.revertOnOwnFailure(ownResult, () => client.delete(irodsData))
				case false =>
					UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => client.delete(irodsData))
			.recover:
				case _ => ownResult

end IrodsUploadTask

object IrodsUploadTask:

	def apply(statObj: StaticObject, client: IRODSClient)(using Envri, ExecutionContext, Scheduler) =
		new IrodsUploadTask(statObj.hash, B2SafeUploadTask.irodsData(statObj), client)

	def apply(format: Option[URI], hash: Sha256Sum, client: IRODSClient)(using Envri, ExecutionContext, Scheduler) =
		new IrodsUploadTask(hash, B2SafeUploadTask.irodsData(format, hash), client)
