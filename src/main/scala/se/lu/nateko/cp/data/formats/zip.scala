package se.lu.nateko.cp.data.formats

import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import scala.jdk.CollectionConverters.EnumerationHasAsScala
import scala.util.Try
import scala.util.Using

object zip:

	def listEntries(zipFile: File): Try[IndexedSeq[ZipEntry]] =
		Using(ZipFile(zipFile)){
			_.entries.asScala.filterNot(_.isDirectory).toIndexedSeq
		}
