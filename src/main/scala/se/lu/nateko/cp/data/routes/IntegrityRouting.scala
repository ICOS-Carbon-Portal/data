package se.lu.nateko.cp.data.routes

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalUnit

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.UploadConfig
import se.lu.nateko.cp.data.api.MetaClient.Paging
import se.lu.nateko.cp.data.services.fetch.IntegrityControlService

class IntegrityRouting(authRouting: AuthRouting, config: UploadConfig)(implicit mat: Materializer, ctxt: ExecutionContext){
	import IntegrityControlService.ReportSource

	def route(service: IntegrityControlService) = (pathPrefix("integrityControl") & authRouting.userRequired){ uid =>

		if(!config.admins.contains(uid.email)) complete(StatusCodes.Forbidden -> "Only admins can perform integrity control")
		else parameters("fix".?, "offset".as[Int].?, "limit".as[Int].?){(fix, offsetOpt, limitOpt) =>

			val paging = new Paging(offsetOpt.getOrElse(0), limitOpt)

			def produceReport(prefix: String, maker: Boolean => ReportSource) = {

				val src = maker(fix.contains("true")).map{
					report => ByteString(s"${report.statement}\n", StandardCharsets.UTF_8)
				}
				val df = DateTimeFormatter.ofPattern(s"'${prefix}_'yyyy-MM-dd_HH_mm_ss'.txt'").withZone(ZoneId.systemDefault)
				val reportPath = Paths.get("").resolve("integrityReports")
					.resolve(df.format(Instant.now()))
				Files.createDirectories(reportPath.getParent)

				src.toMat(FileIO.toPath(reportPath))(Keep.right).run().onComplete{ioTry =>
					val msg = ioTry match{
						case Failure(err) => "FAIL: " + err.getMessage
						case Success(io) => s"SUCCESS: report writing finished, written ${io.count} bytes"
					}
					Files.write(reportPath, msg.getBytes(StandardCharsets.UTF_8), StandardOpenOption.APPEND)
				}
				complete(s"Integrity control '$prefix' started, logging to $reportPath")
			}

			path("local"){
				produceReport("local", service.getReportOnLocal(_, paging))
			} ~
			path("remote"){
				produceReport("remote", service.getReportOnRemote(_, paging))
			} ~
			path("objectslist"){
				produceReport("objectslist", _ => service.getObjectsList(paging))
			} ~
			(path("listirodsfolder") & parameter("path")){path =>
				complete(service.listIrodsFolder(path).mkString("\n"))
			}
		}
	}

	private def responseEntity(text: Source[String, Any]) = HttpEntity(
		ContentTypes.`text/plain(UTF-8)`,
		text.map(s => ByteString(s"${s}\n", StandardCharsets.UTF_8))
	)
}
