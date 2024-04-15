package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.streams.NetCdfValidator

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import NetCdfValidator.Result.*

class NetCdfValidatingUploadTask(using ExecutionContext) extends ValidatingUploadTask[NetCdfValidator.Result]:

	override def validator = NetCdfValidator

	override def validateResult(result: NetCdfValidator.Result) = result match
		case Valid   => DummySuccess
		case Invalid => failure("Not a NetCDF file")
		case NoData  => failure("Empty file instead of a NetCDF file")

end NetCdfValidatingUploadTask
