package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Source
import akka.stream.scaladsl.StreamConverters

import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import scala.concurrent.ExecutionContext

import ZipEntryFlow.{FileEntry, FileLikeSource}

object ZipEntrySource:

	def fileEntry(zipFile: File, entry: ZipEntry)(using ExecutionContext): FileEntry =
		val source: FileLikeSource = Source
			.lazySingle(() => ZipFile(zipFile))
			.flatMapConcat(zip =>
				StreamConverters
					.fromInputStream(() => zip.getInputStream(entry))
					.mapMaterializedValue(_.onComplete(_ => zip.close()))
			)
		val targetEntry = ZipEntry(entry.getName)
		targetEntry.setTime(entry.getTime)
		targetEntry.setSize(entry.getSize)
		targetEntry.setCrc(entry.getCrc)
		targetEntry -> source
