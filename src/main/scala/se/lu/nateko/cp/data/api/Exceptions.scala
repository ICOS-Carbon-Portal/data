package se.lu.nateko.cp.data.api

import scala.util.control.NoStackTrace
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

sealed class CpDataException(val message: String) extends RuntimeException(
	if(message == null) "" else message
) with NoStackTrace

sealed class UploadUserError(message: String) extends CpDataException(message)

final class MetadataObjectNotFound(hash: Sha256Sum) extends UploadUserError(
	s"No metadata found for data object with SHA-256 hash of $hash"
)

final class UnauthorizedUpload(message: String) extends CpDataException(message)

sealed class CpDataParsingException(message: String) extends CpDataException(message)

final class WdcggParsingException(message: String) extends CpDataParsingException(message)
final class EcoCsvParsingException(message: String) extends CpDataParsingException(message)