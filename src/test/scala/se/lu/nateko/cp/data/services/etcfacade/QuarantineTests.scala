package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import org.scalatest.funsuite.AnyFunSuite
import scala.jdk.CollectionConverters.IteratorHasAsScala

class QuarantineTests extends AnyFunSuite:
	import FacadeService.{OldFileMaxAge, QuarantineFolderName, findExpiredFiles, moveToQuarantine}

	private def withStationFolder(test: Path => Unit): Unit =
		val folder = Files.createTempDirectory("etc-staging")
		try test(folder)
		finally Files.walk(folder).iterator.asScala.toSeq.reverse.foreach(Files.deleteIfExists)

	private val etcFile = "IT-Cp2_BM_20260922_L06_F01.dat"
	private val objectFile = "2TbSKo6s0RvqKni9Bm95JLkf"

	test("only staged files older than the max age expire"){
		withStationFolder{folder =>
			Seq(etcFile, objectFile, "desktop.ini").foreach(name => Files.writeString(folder.resolve(name), "x"))
			Files.createDirectories(folder.resolve(QuarantineFolderName))

			assert(findExpiredFiles(folder, Instant.now()).isEmpty)

			val later = Instant.now().plus(OldFileMaxAge).plusSeconds(3600)
			val expired = findExpiredFiles(folder, later).map(_.getFileName.toString).toSet
			assert(expired == Set(etcFile, objectFile))
		}
	}

	test("quarantined files leave the staging folder and are not found again"){
		withStationFolder{folder =>
			val file = folder.resolve(objectFile)
			Files.writeString(file, "content")

			val target = moveToQuarantine(file)

			assert(!Files.exists(file))
			assert(target == folder.resolve(QuarantineFolderName).resolve(objectFile))
			assert(Files.readString(target) == "content")
			val later = Instant.now().plus(OldFileMaxAge).plusSeconds(3600)
			assert(findExpiredFiles(folder, later).isEmpty)
		}
	}
