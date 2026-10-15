package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.{Files, Path}
import scala.collection.mutable

/** In-process receipt generations. Existing files start at generation zero after a restart. */
private[etcfacade] class StagingRevisions:
	private val revisions = mutable.Map.empty[Path, Long]
	private var sequence = 0L

	def current(path: Path): Long = synchronized{revisions.getOrElse(path, 0L)}

	def forgetDeleted(): Unit = synchronized{
		revisions.filterInPlace((path, _) => Files.exists(path))
	}

	def replace(path: Path)(move: => Unit): Unit = synchronized{
		move
		sequence += 1
		revisions(path) = sequence
	}

	def deleteIfUnchanged(path: Path, revision: Long): Unit = synchronized{
		if current(path) == revision then
			Files.deleteIfExists(path)
			revisions.remove(path)
	}
