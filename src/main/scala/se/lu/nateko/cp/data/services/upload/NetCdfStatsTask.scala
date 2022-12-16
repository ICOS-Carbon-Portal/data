package se.lu.nateko.cp.data.services.upload

import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.api.CpDataParsingException
import se.lu.nateko.cp.data.formats.netcdf.NetCdfViewService
import se.lu.nateko.cp.meta.core.data.NetCdfExtract
import se.lu.nateko.cp.meta.core.data.VarInfo
import ucar.ma2.MAMath
import ucar.nc2.Variable
import ucar.nc2.dataset.NetcdfDataset

import java.io.File
import java.util.concurrent.Executors
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Success
import scala.util.Try
import scala.util.Using

import ExecutionContext.{global => ctxt}
import se.lu.nateko.cp.data.formats.netcdf.NetcdfUtil

class NetCdfStatsTask(varNames: Seq[String], file: File, config: NetCdfConfig, tryIngest: Boolean) extends UploadTask {

	def sink: Sink[ByteString, Future[UploadTaskResult]] =
		if (tryIngest) //need to save to the file, as no FileSavingUploadTask is being run in parallel
			FileIO.toPath(file.toPath).mapMaterializedValue(_.map(ioRes => FileWriteSuccess(ioRes.count))(ctxt))
		else
			Sink.cancelled.mapMaterializedValue(_ => Future.successful(DummySuccess))

	def onComplete(own: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		(if varNames.isEmpty
		then Future.successful(IngestionSuccess(NetCdfExtract(Nil)))
		else failIfOthersFailed(otherTaskResults) {
			val javaExe = Executors.newFixedThreadPool(config.statsCalcParallelizm)
			given ExecutionContext = ExecutionContext.fromExecutorService(javaExe)
			readNetCdf
				.map(IngestionSuccess(_))
				.recover{case err => IngestionFailure(err)}
				.andThen(_ => javaExe.shutdown())(ctxt)
		}).andThen{_ =>
			if tryIngest && file.exists() then file.delete()
		}(ctxt)

	private def readNetCdf(using ExecutionContext): Future[NetCdfExtract] =
		Future{
			val service = NetCdfViewService(file.toPath, config)
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

			//the following code block is to test readability and crash if the test fails
			service.getAvailableDates
			varNames.foreach{varName =>
				val elevation0 = service.getAvailableElevations(varName).indices.headOption
				service.getRaster(0, varName, elevation0)
			}

			val varInfoFuts = varNames.map(NetcdfUtil.calcMinMax(file, _))
			Future.sequence(varInfoFuts).map(NetCdfExtract(_))
		}.flatten
}
