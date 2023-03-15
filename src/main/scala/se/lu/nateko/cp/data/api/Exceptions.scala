package se.lu.nateko.cp.data.api

import scala.util.control.NoStackTrace
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import scala.concurrent.Future

sealed class CpDataException(val message: String) extends RuntimeException(
	if(message == null) "" else message
) with NoStackTrace

sealed class UploadUserError(message: String) extends CpDataException(message)

final class ChecksumError(message: String) extends CpDataException(message)

final class MetadataObjectNotFound(hash: Sha256Sum) extends UploadUserError(
	s"No metadata found for data object with SHA-256 hash of $hash"
)

final class MetadataObjectIncomplete(objLabel: Option[String], message: String) extends UploadUserError(
	s"Metadata incomplete${objLabel.fold("")(" for " + _)}: $message"
)

final class UnauthorizedUpload(message: String) extends CpDataException(message)

sealed class CpDataParsingException(message: String) extends CpDataException(message)

final class EcoCsvParsingException(message: String) extends CpDataParsingException(message)
final class DailyCsvParsingException(message: String) extends CpDataParsingException(message)

def dataFail[T](msg: String): Future[T] = Future.failed(CpDataException(msg))
