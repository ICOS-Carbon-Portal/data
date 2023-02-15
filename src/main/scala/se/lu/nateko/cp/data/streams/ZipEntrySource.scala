package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters

import java.io.File
import java.util.zip.ZipEntry
import scala.concurrent.ExecutionContext
import se.lu.nateko.cp.data.formats.zip

import ZipEntryFlow.{FileEntry, FileLikeSource}

object ZipEntrySource:

	def fileEntry(zipFile: File, entry: ZipEntry)(using ExecutionContext): FileEntry =
		val source: FileLikeSource = Source
			.lazySingle(() => zip.open(zipFile))
			.flatMapConcat(zipFile =>
				StreamConverters
					.fromInputStream(() => zipFile.getInputStream(entry))
					.mapMaterializedValue(_.onComplete(_ => zipFile.close()))
			)
		val targetEntry = ZipEntry(entry.getName)
		targetEntry.setTime(entry.getTime)
		targetEntry.setSize(entry.getSize)
		targetEntry.setCrc(entry.getCrc)
		targetEntry -> source
