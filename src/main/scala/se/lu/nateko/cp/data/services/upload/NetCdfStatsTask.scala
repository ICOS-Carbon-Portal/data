package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Try, Using}
import java.io.File
import se.lu.nateko.cp.meta.core.data.NetCdfExtract
import ucar.nc2.Variable
import ucar.nc2.dataset.NetcdfDataset;
import ucar.ma2.MAMath
import se.lu.nateko.cp.meta.core.data.VarInfo
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.formats.netcdf.NetcdfUtil

class NetCdfStatsTask(varNames: Seq[String], file: File, config: NetCdfConfig, tryIngest: Boolean)(using ExecutionContext) extends UploadTask {

	def sink: Sink[ByteString, Future[UploadTaskResult]] =
		if (tryIngest) //need to save to the file, as no FileSavingUploadTask is being run in parallel
			FileIO.toPath(file.toPath).mapMaterializedValue(_.map(ioRes => FileWriteSuccess(ioRes.count)))
		else
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(DummySuccess))

	def onComplete(own: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		if(varNames.isEmpty)
			Future.successful(IngestionSuccess(NetCdfExtract(Nil)))
		else {
			val failures = otherTaskResults.collect{
				case fail: UploadTaskFailure => fail
			}
			if(!failures.isEmpty)
				Future.successful(CancelledBecauseOfOthers(failures))
			else Future{
				readNetCdf.fold(IngestionFailure.apply, IngestionSuccess.apply)
			}
		}

	private def readNetCdf: Try[NetCdfExtract] =
		Try(new NetcdfUtil(config).service(file.toPath)).flatMap{service =>
			val availableVars = service.getVariables.toSet
			val missingVariables = varNames.filterNot(availableVars.contains)

			if(!missingVariables.isEmpty) throw new CpDataParsingException({
				import spray.json._
				import se.lu.nateko.cp.data.ConfigReader.{given RootJsonFormat[NetCdfConfig]}
				s"""The following variable(s) cannot be previewable: ${missingVariables.mkString(", ")}.
				|This may be due to them missing in the file, or lacking the expected lat/lon and time dimensions.
				|Please refer to the following config to learn about supported names for dimension variables:
				|${config.copy(folder = "<omitted>").toJson.prettyPrint}""".stripMargin
			})

			val date0 = service.getAvailableDates()(0)
			varNames.foreach{varName =>
				val elevation0 = service.getAvailableElevations(varName).headOption.orNull
				service.getRaster(date0, varName, elevation0)
			}

			Using(NetcdfDataset.openDataset(file.getAbsolutePath)){ncd =>
				val varInfos = varNames.map{varName =>
					val v = ncd.findVariable(varName)
					calcMinMax(v)
				}
				NetCdfExtract(varInfos)
			}
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
