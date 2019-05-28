package se.lu.nateko.cp.data.services.fetch

import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.upload.UploadService
import java.net.URI
import scala.concurrent.Future
import akka.stream.scaladsl.Source
import scala.concurrent.ExecutionContext
import scala.util.Try
import scala.collection.immutable.Iterable
import akka.stream.scaladsl.FileIO
import akka.stream.Materializer
import se.lu.nateko.cp.data.streams.KeepFuture
import scala.util.Failure
import scala.util.Success
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Keep

class IntegrityControlService(uploader: UploadService)(implicit ctxt: ExecutionContext, mat: Materializer){
	import IntegrityControlService._

	def getReport(fetchBaddiesFromRemote: Boolean): Future[Source[ReportScan, Future[ReportAcc]]] = uploader.meta.getDobjStorageInfos.map(_
		.mapAsync(2){dobjStInfo =>
			val file = uploader.getFile(dobjStInfo.format, dobjStInfo.hash)

			val problem: Option[String] = {
				if(!file.exists) Some("file missing")
				else if(file.length != dobjStInfo.size) Some(s"expected size ${dobjStInfo.size} got ${file.length}")
				else None
			}

			problem.fold[Future[Report]](Future.successful(OkReport)){prob =>

				if(fetchBaddiesFromRemote){
					uploader.getRemoteStorageSource(dobjStInfo.format, dobjStInfo.hash)
						.toMat(FileIO.toPath(file.toPath))(KeepFuture.right)
						.run()
						.map{iores =>
							val extraProblem: Option[String] = iores.status match{
								case Success(_) =>
									if(iores.count == dobjStInfo.size) None
									else Some(s"wrong byte count while fetching from remote (${iores.count} instead of ${dobjStInfo.size})")
								case Failure(ex) =>
									Some(s"failed fetching from remote (${ex.getMessage})")
							}
							extraProblem.fold(new ProblemReport(dobjStInfo, prob, true)){extraProb =>
								new ProblemReport(dobjStInfo, prob + "; " + extraProb, false)
							}
						}
				} else Future.successful(new ProblemReport(dobjStInfo, prob, false))
			}
		}
		.scan(new ReportAcc(0, None))(_ next _)
		.alsoToMat(Sink.last)(Keep.right)
		.mapConcat(_.reports)
	)

}

object IntegrityControlService{
	sealed trait Report
	object OkReport extends Report
	sealed trait ReportScan{
		def statement: String
	}
	class OkCount(count: Int) extends ReportScan{
		def statement: String = s"OK: $count files"
	}
	class ProblemReport(obj: MetaClient.DobjStorageInfo, problem: String, solved: Boolean) extends ReportScan with Report{
		def statement: String = {
			val title = if(solved) "Fixed problem" else "Problem"
			s"$title: ${obj.landingPage}, ${obj.fileName} ($problem)"
		}
	}

	class ReportAcc(val successCount: Int, val problem: Option[ProblemReport]){

		private val shouldResetSuccessCount: Boolean = problem.isDefined || successCount % 10000 == 0

		def reports: Iterable[ReportScan] = {

			val okReport: Iterable[ReportScan] = if(successCount > 0 && shouldResetSuccessCount)
				Iterable(new OkCount(successCount)) else Iterable.empty

			val problemReport: Iterable[ReportScan] = problem.fold(Iterable.empty[ReportScan])(prob => Iterable(prob))

			okReport ++ problemReport
		}

		def next(report: Report): ReportAcc = {
			val nextNewCountBase = (if(shouldResetSuccessCount) 0 else successCount)

			report match {
				case probRep: ProblemReport =>
					new ReportAcc(nextNewCountBase, Some(probRep))
				case OkReport =>
					new ReportAcc(nextNewCountBase + 1, None)
			}
		}
	}
}
