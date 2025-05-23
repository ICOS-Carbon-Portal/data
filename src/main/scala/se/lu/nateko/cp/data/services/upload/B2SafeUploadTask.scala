package se.lu.nateko.cp.data.services.upload

import akka.Done
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import eu.icoscp.envri.Envri
import se.lu.nateko.cp.data.api.B2SafeClient
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

class B2SafeUploadTask private (hash: Sha256Sum, irodsData: IrodsData, client: B2SafeClient)(implicit ctxt: ExecutionContext) extends UploadTask{

	private val existsFut: Future[Boolean] = client.getHashsum(irodsData).flatMap{
		case Some(`hash`) => Future.successful(true)
		case _ => client.create(irodsData.parent).map(_ => false)
	}

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val sinkFut: Future[Sink[ByteString, Future[UploadTaskResult]]] = existsFut.map{
			case true => Sink.cancelled.mapMaterializedValue(
					_ => Future.successful(B2SafeSuccess)
				)
			case false =>
				client.objectSink(irodsData).mapMaterializedValue(
					_.map{resHash =>
						if(resHash == hash) B2SafeSuccess
						else B2SafeFailure(hashError(resHash))
					}
				)
		}

		Sink.lazyFutureSink(() => sinkFut).mapMaterializedValue(_
			.flatten
			.recover{
				case err => B2SafeFailure(err)
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

	private def hashError(actual: Sha256Sum) = new CpDataException(s"B2SAFE returned SHA256 $actual instead of $hash")

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

object B2SafeUploadTask{

	def apply(statObj: StaticObject, client: B2SafeClient)(using Envri, ExecutionContext) =
		new B2SafeUploadTask(statObj.hash, IrodsUploadTask.irodsData(statObj), client)

	def apply(format: Option[URI], hash: Sha256Sum, client: B2SafeClient)(using Envri, ExecutionContext) =
		new B2SafeUploadTask(hash, IrodsUploadTask.irodsData(format, hash), client)


}
