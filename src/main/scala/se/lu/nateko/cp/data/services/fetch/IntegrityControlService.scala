package se.lu.nateko.cp.data.services.fetch

import akka.stream.Materializer
import akka.stream.scaladsl.FileIO
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
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
import eu.icoscp.envri.Envri

class IntegrityControlService(uploader: UploadService)(using ExecutionContext, Materializer):
	import IntegrityControlService._
	import MetaClient.{DobjStorageInfo, Paging}

	private def getReportOnLocal(fetchBaddiesFromRemote: Boolean, storage: Source[DobjStorageInfo, Any])(using Envri): ReportSource = storage
		.mapAsync(2){dobjStInfo => //keep parallelizm low to avoid thread starvation (may be using actor system's default)
			val (file, localProblemFut) = localFileProblem(dobjStInfo)

			localProblemFut.flatMap{
				case None =>
					Future.successful(new OkReport(dobjStInfo))

				case Some(prob) if fetchBaddiesFromRemote =>
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
				case Some(prob) =>
					Future.successful(new ProblemReport(dobjStInfo, prob, false))
			}
		}

	def getDataObjLocalReport(fetchBaddiesFromRemote: Boolean, paging: Paging)(using Envri): ReportSource =
		getReportOnLocal(fetchBaddiesFromRemote, uploader.meta.getDobjStorageInfos(paging))

	def getDocObjLocalReport(fetchBaddiesFromRemote: Boolean)(using Envri): ReportSource =
		getReportOnLocal(fetchBaddiesFromRemote, uploader.meta.docObjsStorageInfos)

	def getDataObjRemoteReport(uploadMissingToRemote: Boolean, paging: Paging)(using Envri): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.getDobjStorageInfos(paging))

	def getDataObjRemoteReport(uploadMissingToRemote: Boolean, dobjs: Seq[URI])(using Envri): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.getDobjStorageInfos(dobjs))

	def getDocObjRemoteReport(uploadMissingToRemote: Boolean)(using Envri): ReportSource =
		getReportOnRemote(uploadMissingToRemote, uploader.meta.docObjsStorageInfos)

	private def getReportOnRemote(uploadMissingToRemote: Boolean, storage: Source[DobjStorageInfo, Any])(using Envri): ReportSource = storage
		.mapAsync(3){dobjStInfo =>
			import dobjStInfo.{format, hash}

			uploader.remoteSourceExists(format, hash).flatMap{
				case true =>
					Future.successful(new OkReport(dobjStInfo))

				case false =>
					val (file, localProbFut) = localFileProblem(dobjStInfo)

					localProbFut.flatMap{localProb =>

						val prob = "file absent on the remote repo" + localProb.fold("")("; " + _)

						if(uploadMissingToRemote && localProb.isEmpty){
							uploader.uploadToRemoteStorage(format, hash, FileIO.fromPath(file)).map{_ =>
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
			}
			.recover{
				case err: Throwable =>
					new ProblemReport(dobjStInfo, "problem checking presence on remote: " + err.getMessage, false)
			}
		}

	def getObjectsList(paging: Paging): ReportSource = uploader.meta.getDobjStorageInfos(paging)
		.map(new OkReport(_)).throttle(10, 1.second)

	private def localFileProblem(dobjStInfo: DobjStorageInfo): (Path, Future[Option[String]]) = {
		import dobjStInfo.{format, hash, size}
		val file = uploader.getFile(format, hash, true)

		val problem: Future[Option[String]] =
			if dobjStInfo.isNotStored
				then Future.successful(None)
			else if !file.exists
				then Future.successful(Some("file missing"))
			else if file.length != size
				then Future.successful(Some(s"expected size $size got ${file.length}"))
			else FileIO.fromPath(file.toPath)
				.viaMat(DigestFlow.sha256)(KeepFuture.right)
				.toMat(Sink.ignore)(Keep.left)
				.run().map{ diskHash =>
					if diskHash == hash then None
					else Some(s"File on disk has wrong SHA-256 hash: ${diskHash.base64}")
				}
		(file.toPath, problem)
	}

end IntegrityControlService

object IntegrityControlService:
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
