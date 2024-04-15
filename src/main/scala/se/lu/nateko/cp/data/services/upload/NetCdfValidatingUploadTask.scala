package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.NetCdfValidator
import se.lu.nateko.cp.data.streams.NcResult.*
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import se.lu.nateko.cp.data.streams.NetCdfValidator
import NetCdfValidator.*

class NetCdfValidatingUploadTask(using ExecutionContext) extends UploadTask:

	def sink: Sink[ByteString, Future[UploadTaskResult]] = NetCdfValidator
		.assertFormat(NoData, Invalid).mapMaterializedValue{
			_.map{
				case Valid => DummySuccess
				case Invalid => ncFailure("Not a NetCDF file")
				case NoData => ncFailure("Empty file instead of a NetCDF file")
			}
		}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = Future.successful(ownResult)

	def ncFailure(msg: String) = IngestionFailure(CpDataParsingException(msg))

end NetCdfValidatingUploadTask
