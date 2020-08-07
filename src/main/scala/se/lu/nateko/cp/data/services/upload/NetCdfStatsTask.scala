package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.Sink
import akka.util.ByteString

import scala.jdk.CollectionConverters.CollectionHasAsScala
import scala.concurrent.{ExecutionContext, Future}
import java.io.File
import se.lu.nateko.cp.meta.core.data.NetCdfExtract
import ucar.nc2.{NetcdfFile, Variable}
import ucar.ma2.MAMath
import se.lu.nateko.cp.meta.core.data.VarInfo
import se.lu.nateko.cp.data.api.CpDataParsingException

class NetCdfStatsTask(varNames: Seq[String], file: File)(implicit ctxt: ExecutionContext) extends UploadTask {

	def sink: Sink[ByteString, Future[UploadTaskResult]] = Sink.cancelled
		.mapMaterializedValue(_ => Future.successful(DummySuccess))

	def onComplete(own: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		if(varNames.isEmpty) Future.successful(NotApplicable) else {
			val failures = otherTaskResults.collect{
				case fail: UploadTaskFailure => fail
			}
			if(!failures.isEmpty) Future.successful(CancelledBecauseOfOthers(failures))
			else Future{
				IngestionSuccess(readNetCdf)
			}
		}

	private def readNetCdf: NetCdfExtract = {
		val ncf = NetcdfFile.open(file.getAbsolutePath)
		try {
			val varLookup = ncf.getVariables.asScala.map(v => v.getShortName -> v).toMap
			val varInfos = varNames.map{varName =>
				val v = varLookup.getOrElse(varName, throw new CpDataParsingException(s"Variable $varName not found in the NetCdf file"))
				assert(v.getRank >= 3, s"Variable $varName has ${v.getRank} dimenstions, expected at least 3")
				calcMinMax(v)
			}
			NetCdfExtract(varInfos)
		}
		finally ncf.close()
	}

	private def calcMinMax(v: Variable): VarInfo = {
		val data = v.read()
		val skipValue = Option(v.findAttribute("_FillValue"))
		val minMax = skipValue.fold(MAMath.getMinMax(data)){ skip =>
			MAMath.getMinMaxSkipMissingData(data, skip.getNumericValue().doubleValue())
		}
		VarInfo(v.getShortName, minMax.min, minMax.max)
	}
}
