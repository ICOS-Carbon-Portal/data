package se.lu.nateko.cp.data.services.upload

import akka.actor.Scheduler
import akka.Done
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import eu.icoscp.envri.Envri
import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.data.api.IrodsItem
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
		case _ => createCollection().map(_ => false)


	def sink: Sink[ByteString, Future[UploadTaskResult]] = 
		val sinkFut: Future[Sink[ByteString, Future[UploadTaskResult]]] = existsFut.map:
			case true => Sink.cancelled.mapMaterializedValue:
					_ => Future.successful(IrodsSuccess(hash))

			case false =>
				client.objectSink(irodsData).mapMaterializedValue:
					_.flatMap(_ => checkHashsum()).map: resHash =>
						if(resHash == hash) IrodsSuccess(hash)
						else IrodsFailure(hashError(resHash))

		Sink.lazyFutureSink(() => sinkFut).mapMaterializedValue:
			_.flatten.recover:
				case err => IrodsFailure(err)

	private def checkHashsum(): Future[Sha256Sum] = akka.pattern.retry(
		() => client.getHashsum(irodsData), 5, 500.millis
	).transform(identity, err => CpDataException(s"iRODS hashsum checking failure for ${irodsData.path}: ${err.getMessage}"))

	private def createCollection(): Future[Done] = akka.pattern.retry(
		() => client.create(irodsData.parent, true), 3, 500.millis
	).transform(identity, err => CpDataException(s"iRODS collection creation failure for ${irodsData.parent.path}: ${err.getMessage}"))

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
		new IrodsUploadTask(statObj.hash, irodsData(statObj), client)

	def apply(format: Option[URI], hash: Sha256Sum, client: IRODSClient)(using Envri, ExecutionContext, Scheduler) =
		new IrodsUploadTask(hash, irodsData(format, hash), client)

	def irodsData(statObj: StaticObject)(using Envri): IrodsData = irodsData(UploadService.fileFolder(statObj), statObj.hash)
	def irodsData(format: Option[URI], hash: Sha256Sum)(using Envri): IrodsData = irodsData(UploadService.fileFolder(format), hash)

	private def irodsData(folder: String, hash: Sha256Sum)(using envri: Envri): IrodsData =
		val envriFolder = envri match
			case Envri.ICOS | Envri.SITES => IrodsItem.Root
			case Envri.ICOSCities => IrodsColl("cities")

		val baseColl = IrodsColl(folder, Some(envriFolder))
		val coll = IrodsColl(hash.base64Url.take(2), Some(baseColl))
		IrodsData(UploadService.fileName(hash), coll)
