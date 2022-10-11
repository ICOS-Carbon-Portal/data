package se.lu.nateko.cp.data.formats

import scala.util.Using
import java.util.zip.ZipFile
import scala.jdk.CollectionConverters.EnumerationHasAsScala
import scala.util.Try
import java.io.File

object zip:
	opaque type ZipEntryId <: String = String

	def listEntryIds(zipFile: File): Try[IndexedSeq[ZipEntryId]] =
		Using(ZipFile(zipFile)){
			_.entries.asScala.collect{
				case entry if !entry.isDirectory => entry.getName
			}.toIndexedSeq
		}
