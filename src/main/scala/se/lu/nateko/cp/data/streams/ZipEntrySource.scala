package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.data.formats.zip.ZipEntryId

import java.nio.file.Path
import java.util.zip.ZipFile
import scala.concurrent.ExecutionContext

import ZipEntryFlow.FileLikeSource

object ZipEntrySource:

	def source(zipFile: Path, entry: ZipEntryId)(using ExecutionContext): FileLikeSource = Source
		.lazySingle(() => ZipFile(zipFile.toFile))
		.flatMapConcat(zip =>
			StreamConverters
				.fromInputStream(() => zip.getInputStream(zip.getEntry(entry)))
				.mapMaterializedValue(_.onComplete(_ => zip.close()))
		)
