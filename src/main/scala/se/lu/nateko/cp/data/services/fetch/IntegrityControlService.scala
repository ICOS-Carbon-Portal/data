package se.lu.nateko.cp.data.services.fetch

import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.data.streams.DigestFlow
import se.lu.nateko.cp.data.streams.KeepFuture

import java.net.URI
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

class IntegrityControlService(uploader: UploadService)(implicit ctxt: ExecutionContext, mat: Materializer){
	import IntegrityControlService._
	import MetaClient.{DobjStorageInfo, Paging}

	def getReportOnLocal(fetchBaddiesFromRemote: Boolean, paging: Paging): ReportSource = uploader
		.meta.getDobjStorageInfos(paging)
		.mapAsync(2){dobjStInfo =>
			val (file, problem) = localFileProblem(dobjStInfo)

			problem.fold[Future[Report]](Future.successful(new OkReport(dobjStInfo))){prob =>

				if(fetchBaddiesFromRemote){
					val tmpFile = Files.createTempFile(file.getParent(), s"cpdataIntegr_${dobjStInfo.hash.id}_", "")

					uploader.getRemoteStorageSource(dobjStInfo.format, dobjStInfo.hash)
						.viaMat(DigestFlow.sha256)(KeepFuture.right)
						.toMat(FileIO.toPath(tmpFile))(KeepFuture.both)
						.run()
						.map{(hash, iores) =>
							val extraProblem: Option[String] =
								if iores.count != dobjStInfo.size then
									Some(s"wrong byte count when fetching from remote (${iores.count} instead of ${dobjStInfo.size})")
								else if hash != dobjStInfo.hash then
									Some(s"Wrong SHA-256 hashsum when fetching from remote ($hash instead of ${dobjStInfo.hash}")
								else None

							extraProblem.fold{
								Files.move(tmpFile, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
								new ProblemReport(dobjStInfo, prob, true)
							}{extraProb =>
								new ProblemReport(dobjStInfo, prob + "; " + extraProb, false)
							}
						}
						.recover{
							case err: Throwable =>
								val extraProb = "Problem recovering from remote: " + err.getMessage()
								new ProblemReport(dobjStInfo, prob + "; " + extraProb, false)
						}
						.andThen{
							_ => Files.deleteIfExists(tmpFile)
						}
				} else Future.successful(new ProblemReport(dobjStInfo, prob, false))
			}
		}


	def getDataObjRemoteReport(uploadMissingToRemote: Boolean, paging: Paging): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.getDobjStorageInfos(paging))

	def getDataObjRemoteReport(uploadMissingToRemote: Boolean, dobjs: Seq[URI]): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.getDobjStorageInfos(dobjs))

	def getDocObjRemoteReport(uploadMissingToRemote: Boolean): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.docObjsStorageInfos)

	private def getReportOnRemote(uploadMissingToRemote: Boolean, storage: Source[DobjStorageInfo, Any]): ReportSource = storage
		.mapAsync(3){dobjStInfo =>
			import dobjStInfo.{format, hash}

			uploader.b2SafeSourceExists(format, hash).flatMap{
				case true =>
					Future.successful(new OkReport(dobjStInfo))
				case false =>
					val (file, localProb) = localFileProblem(dobjStInfo)
					val prob = "file absent in B2SAFE" + localProb.fold("")("; " + _)

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

		val problem: Option[String] =
			if dobjStInfo.isNotStored
				then None
			else if !file.exists
				then Some("file missing")
			else if file.length != size
				then Some(s"expected size $size got ${file.length}")
			else None
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
