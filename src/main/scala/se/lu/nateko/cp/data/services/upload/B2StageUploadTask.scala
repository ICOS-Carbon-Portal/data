package se.lu.nateko.cp.data.services.upload

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.B2StageClient
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.data.api.IrodsColl
import se.lu.nateko.cp.data.api.IrodsData
import akka.stream.scaladsl.Keep

class B2StageUploadTask(dataObject: DataObject, client: B2StageClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	private[this] val (irodsData, existsFut) = {
		val coll = IrodsColl(UploadService.fileFolder(dataObject)) //parent is root
		val obj = IrodsData(UploadService.fileName(dataObject), coll)

		val objExistsFut: Future[Boolean] = client.exists(coll).flatMap{
			case true => client.exists(obj)
			case false => client.create(coll).map(_ => false)
		}

		(obj, objExistsFut)
	}

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val sinkFut = existsFut.map{
			case true => Sink.cancelled.mapMaterializedValue(
					_ => Future.successful(B2StageSuccess)
				)
			case false =>
				client.objectSink(irodsData).mapMaterializedValue(
					_.map{hash =>
						if(hash == dataObject.hash) B2StageSuccess
						else B2StageFailure(
							new CpDataException(s"B2STAGE returned SHA256 $hash instead of " + dataObject.hash)
						)
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

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]): Future[UploadTaskResult] =
		existsFut.flatMap{
			case true =>
				UploadTask.revertOnOwnFailure(ownResult, () => client.delete(irodsData))
			case false =>
				UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => client.delete(irodsData))
		}
}
