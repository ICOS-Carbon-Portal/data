package se.lu.nateko.cp.data.formats

import java.io.File
import java.nio.charset.Charset
import java.util.zip.ZipEntry
import java.util.zip.ZipException
import java.util.zip.ZipFile
import scala.jdk.CollectionConverters.EnumerationHasAsScala
import scala.util.Try
import scala.util.Using

object zip:

	def open(zipFile: File): ZipFile =
		try
			ZipFile(zipFile)
		catch case _: ZipException =>
			ZipFile(zipFile, Charset.forName("IBM437"))

	def listEntries(zipFile: File): Try[IndexedSeq[ZipEntry]] =
		Using(open(zipFile)){
			_.entries.asScala.filterNot(_.isDirectory).toIndexedSeq
		}
