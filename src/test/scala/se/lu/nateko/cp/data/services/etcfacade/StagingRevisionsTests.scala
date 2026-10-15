package se.lu.nateko.cp.data.services.etcfacade

import java.nio.file.Files
import org.scalatest.funsuite.AnyFunSuite

class StagingRevisionsTests extends AnyFunSuite:
	test("cleanup preserves replacements but removes an unchanged staged file"){
		val path = Files.createTempFile("staging-revision", ".txt")
		val revisions = new StagingRevisions
		try
			val original = revisions.current(path)
			revisions.replace(path){Files.writeString(path, "replacement"); ()}
			revisions.deleteIfUnchanged(path, original)
			assert(Files.readString(path) == "replacement")
			val replacement = revisions.current(path)
			revisions.deleteIfUnchanged(path, replacement)
			assert(!Files.exists(path))
			revisions.replace(path){Files.writeString(path, "another"); ()}
			revisions.deleteIfUnchanged(path, replacement)
			assert(Files.exists(path))
		finally Files.deleteIfExists(path)
	}
