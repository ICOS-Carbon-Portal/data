package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters
import se.lu.nateko.cp.data.formats.zip.ZipEntryId

import java.io.File
import java.util.zip.ZipFile
import scala.concurrent.ExecutionContext

import ZipEntryFlow.FileLikeSource

object ZipEntrySource:

	def source(zipFile: File, entry: ZipEntryId)(using ExecutionContext): FileLikeSource = Source
		.lazySingle(() => ZipFile(zipFile))
		.flatMapConcat(zip =>
			StreamConverters
				.fromInputStream(() => zip.getInputStream(zip.getEntry(entry)))
				.mapMaterializedValue(_.onComplete(_ => zip.close()))
		)
