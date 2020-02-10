package se.lu.nateko.cp.data.services.fetch

import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.upload.UploadService
import scala.concurrent.Future
import akka.stream.scaladsl.Source
import scala.concurrent.ExecutionContext
import scala.collection.immutable.Iterable
import akka.stream.scaladsl.FileIO
import akka.stream.Materializer
import se.lu.nateko.cp.data.streams.KeepFuture
import scala.util.Failure
import scala.util.Success
import scala.concurrent.duration.DurationInt
import java.nio.file.Path

class IntegrityControlService(uploader: UploadService)(implicit ctxt: ExecutionContext, mat: Materializer){
	import IntegrityControlService._
	import MetaClient.{DobjStorageInfo, Paging}

	def getReportOnLocal(fetchBaddiesFromRemote: Boolean, paging: Paging): ReportSource = uploader
		.meta.getDobjStorageInfos(paging)
		.mapAsync(2){dobjStInfo =>
			val (file, problem) = localFileProblem(dobjStInfo)

			problem.fold[Future[Report]](Future.successful(new OkReport(dobjStInfo))){prob =>

				if(fetchBaddiesFromRemote){
					uploader.getRemoteStorageSource(dobjStInfo.format, dobjStInfo.hash)
						.toMat(FileIO.toPath(file))(KeepFuture.right)
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


	def getReportOnRemote(uploadMissingToRemote: Boolean, paging: Paging): ReportSource = uploader
		.meta.getDobjStorageInfos(paging)
		.mapAsync(3){dobjStInfo =>
			import dobjStInfo.{format, hash}

			uploader.b2StageSourceExists(format, hash).flatMap{
				case true =>
					Future.successful(new OkReport(dobjStInfo))
				case false =>
					val (file, localProb) = localFileProblem(dobjStInfo)
					val prob = "file absent in B2STAGE" + localProb.fold("")("; " + _)

					if(uploadMissingToRemote && localProb.isEmpty){
						uploader.uploadToB2Stage(format, hash, FileIO.fromPath(file)).map{_ =>
							new ProblemReport(dobjStInfo, prob, true)
						}
						.recover{
							case err: Throwable =>
								new ProblemReport(dobjStInfo, prob + "; problem during upload attempt: " + err.getMessage, false)
						}
					}
					else
						Future.successful(new ProblemReport(dobjStInfo, prob, false))
			}
			.recover{
				case err: Throwable =>
					new ProblemReport(dobjStInfo, "problem checking presence on remote: " + err.getMessage, false)
			}
		}


	def getObjectsList(paging: Paging): ReportSource = uploader.meta.getDobjStorageInfos(paging)
		.map(new OkReport(_)).throttle(10, 1.second)

	private def localFileProblem(dobjStInfo: DobjStorageInfo): (Path, Option[String]) = {
		import dobjStInfo.{format, hash, size}
		val file = uploader.getFile(format, hash)

		val problem: Option[String] = {
			if(!file.exists) Some("file missing")
			else if(file.length != size) Some(s"expected size $size got ${file.length}")
			else None
		}
		(file.toPath, problem)
	}

}

object IntegrityControlService{
	import MetaClient.DobjStorageInfo

	type ReportSource = Source[Report, Any]

	sealed trait Report{
		def statement: String
	}

	class OkReport(obj: DobjStorageInfo) extends Report{
		def statement: String = s"OK: ${obj.landingPage}, ${obj.fileName}"
	}
	class ProblemReport(obj: DobjStorageInfo, problem: String, solved: Boolean) extends Report{
		def statement: String = {
			val title = if(solved) "Fixed problem" else "Problem"
			s"$title: ${obj.landingPage}, ${obj.fileName} ($problem)"
		}
	}

}
