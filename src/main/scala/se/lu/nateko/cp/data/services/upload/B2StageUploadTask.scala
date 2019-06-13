package se.lu.nateko.cp.data.services.upload

import java.net.URI

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.api.B2StageClient
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.api.IrodsColl
import se.lu.nateko.cp.data.api.IrodsData
import se.lu.nateko.cp.data.utils.Akka.done
import se.lu.nateko.cp.meta.core.data.StaticObject
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import scala.util.Failure

class B2StageUploadTask private (hash: Sha256Sum, irodsData: IrodsData, client: B2StageClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	private[this] val existsFut: Future[Boolean] = client.exists(irodsData.parent).flatMap{
		//TODO Add hash control to the existence check
		case true => client.exists(irodsData)
		case false => client.create(irodsData.parent).map(_ => false)
	}

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val sinkFut = existsFut.map{
			case true => Sink.cancelled.mapMaterializedValue(
					_ => Future.successful(B2StageSuccess)
				)
			case false =>
				client.objectSink(irodsData).mapMaterializedValue(
					_.map{resHash =>
						if(resHash == hash) B2StageSuccess
						else B2StageFailure(hashError(resHash))
					}
				)
		}

		Sink.lazyInitAsync(() => sinkFut).mapMaterializedValue(_
			.flatMap{
				case None => Future.failed(new CpDataException("No data came through"))
				case Some(inner) => inner
			}
			.recover{
				case err => B2StageFailure(err)
			}
		)
	}

	def uploadObject(src: Source[ByteString, Any]): Future[Done] = existsFut.flatMap{
		case true =>
			done
		case false =>
			val res = client.uploadObject(irodsData, src).flatMap{resHash =>
				if(resHash == hash) done
				else Future.failed(hashError(resHash))
			}
			res.failed.foreach{_ => client.delete(irodsData)}
			res
	}

	private def hashError(actual: Sha256Sum) = new CpDataException(s"B2STAGE returned SHA256 $actual instead of $hash")

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		existsFut.flatMap{
			case true =>
				UploadTask.revertOnOwnFailure(ownResult, () => client.delete(irodsData))
			case false =>
				UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => client.delete(irodsData))
		}.recover{
			case _ => ownResult
		}
}

object B2StageUploadTask{

	def apply(statObj: StaticObject, client: B2StageClient)(implicit ctxt: ExecutionContext) =
		new B2StageUploadTask(statObj.hash, irodsData(statObj), client)

	def apply(format: URI, hash: Sha256Sum, client: B2StageClient)(implicit ctxt: ExecutionContext) =
		new B2StageUploadTask(hash, irodsData(format, hash), client)

	def irodsData(statObj: StaticObject): IrodsData = irodsData(UploadService.fileFolder(statObj), statObj.hash)
	def irodsData(format: URI, hash: Sha256Sum): IrodsData = irodsData(UploadService.fileFolder(format), hash)

	private def irodsData(folder: String, hash: Sha256Sum): IrodsData =
		IrodsData(UploadService.fileName(hash), IrodsColl(folder)) //parent is root
}
