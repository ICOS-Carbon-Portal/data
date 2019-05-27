package se.lu.nateko.cp.data.services.fetch

import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.upload.UploadService
import java.net.URI
import scala.concurrent.Future
import akka.stream.scaladsl.Source
import scala.concurrent.ExecutionContext
import scala.util.Try
import scala.collection.immutable.Iterable

class IntegrityControlService(uploader: UploadService)(implicit ctxt: ExecutionContext){
	import IntegrityControlService._

	def getReport: Future[Source[ReportScan, Any]] = uploader.meta.getDobjStorageInfos.map(_
		.map{dobjStInfo =>
			val isOk = Try{
				val file = uploader.getFile(dobjStInfo.format, dobjStInfo.hash)
				file.exists && file.length == dobjStInfo.size
			}.getOrElse(false)
			Report(dobjStInfo.landingPage, isOk)
		}
		.scan(new ReportAcc(0, None))(_ next _)
		.mapConcat(_.reports)
	)

	def getDummy: Future[Source[Report, Any]] = uploader.meta.getDobjStorageInfos.map(_.map{dobjStInfo =>
		Report(dobjStInfo.landingPage, true)
	})//("select * where {?s ?p ?o} limit 100")
}

object IntegrityControlService{
	case class Report(landingPage: URI, ok: Boolean)
	sealed trait ReportScan{
		def statement: String
	}
	class OkCount(count: Int) extends ReportScan{
		def statement: String = s"OK: $count files"
	}
	class ProblemReport(landingPage: URI) extends ReportScan{
		def statement: String = s"Problem: $landingPage"
	}
	class ReportAcc(val successCount: Int, val problemObj: Option[URI]){
		def reports: Iterable[ReportScan] = {
			val okReport: Iterable[ReportScan] = if(successCount > 0 && problemObj.isDefined) Iterable(new OkCount(successCount)) else Iterable.empty
			val problemReport: Iterable[ReportScan] = problemObj.fold(Iterable.empty[ReportScan])(uri => Iterable(new ProblemReport(uri)))
			okReport ++ problemReport
		}
		def next(report: Report): ReportAcc = {
			val newCount = (if(problemObj.isDefined) 0 else successCount) + (if(report.ok) 1 else 0)
			val newProblem: Option[URI] = if(report.ok) None else Some(report.landingPage)
			new ReportAcc(newCount, newProblem)
		}
	}
}
