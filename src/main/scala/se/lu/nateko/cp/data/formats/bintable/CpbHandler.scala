package se.lu.nateko.cp.data.formats.bintable

import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.utils.io.withSuffix

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.time.Instant
import scala.util.Failure
import scala.util.Success
import scala.util.Try

object CpbHandler:

	private val FileExtension = ".cpb"
	private val MoratoriumExtension = ".moratorium"

	def cpbWriteStagingFile(originalFile: Path): Path =
		originalFile.withSuffix(FileExtension + ".working")

	def getCpbFileForWriting(originalFile: Path, submissionEndOpt: Option[Instant]): Path =
		submissionEndOpt match
			case Some(submEnd) if submEnd.isAfter(Instant.now()) =>
				writeMoratoriumTime(originalFile, submEnd)
				cpbMoratoriumFile(originalFile)
			case _ => cpbFile(originalFile)

	def getCpbFileForReading(originalFile: Path): Try[Path] =
		val defaultPath = cpbFile(originalFile)

		if Files.exists(defaultPath)
		then Success(defaultPath)
		else
			val cpbMoraFile = cpbMoratoriumFile(originalFile)
			val cpbInfoFile = moratoriumTimeFile(originalFile)

			if Files.exists(cpbMoraFile) && Files.exists(cpbInfoFile) then

				Try(Instant.parse(Files.readString(cpbInfoFile))).flatMap: moraTime =>

					if moraTime.isAfter(Instant.now()) then
						fail(s"Object ${originalFile.getFileName} is under moratorium")
					else
						Files.move(cpbMoraFile, defaultPath, StandardCopyOption.ATOMIC_MOVE)
						Files.delete(cpbInfoFile)
						Success(defaultPath)

			else fail(s"Binary file not found for object ${originalFile.getFileName}")
	end getCpbFileForReading

	private def cpbFile(originalFile: Path): Path =
		originalFile.withSuffix(FileExtension)

	private def cpbMoratoriumFile(originalFile: Path): Path =
		originalFile.withSuffix(FileExtension + MoratoriumExtension)

	private def moratoriumTimeFile(originalFile: Path): Path =
		originalFile.withSuffix(MoratoriumExtension)

	private def writeMoratoriumTime(originalFile: Path, time: Instant): Unit =
		Files.writeString(moratoriumTimeFile(originalFile), time.toString)

	private def fail[T](msg: String): Try[T] = Failure(CpDataException(msg))

end CpbHandler
