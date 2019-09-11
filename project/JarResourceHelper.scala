
import sbt._
import sbt.ModuleID
import sbt.internal.util.{Attributed, AttributeKey}
import java.io.File
import scala.util.{Try, Success, Failure}
import java.util.jar.JarFile
import java.nio.file.NoSuchFileException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

object JarResourceHelper{

	def copyResource(jarInfos: Seq[Attributed[File]], fromModule: ModuleID, resourcePath: String, toFile: File): Try[Unit] = {
		val key = AttributeKey[ModuleID]("moduleID")

		def isEqual(m: ModuleID): Boolean = {
			m.organization == fromModule.organization &&
			m.name.startsWith(fromModule.name) &&
			m.revision == fromModule.revision
		}

		val fromFileTry: Try[File] = jarInfos.collectFirst{
			case attrFile if attrFile.get(key).fold(false)(isEqual) =>
				Success(attrFile.data)
		}.getOrElse(
			Failure(new NoSuchFileException(s"Could not locate module $fromModule among dependencies"))
		)

		fromFileTry.flatMap(fromFile => Try{
			val jar = new JarFile(fromFile)
			val entry = jar.getEntry(resourcePath)
			if(entry == null) throw new NoSuchFileException(s"Resource $resourcePath not found in jar file $fromFile")
			Files.copy(jar.getInputStream(entry), toFile.toPath, StandardCopyOption.REPLACE_EXISTING)
		})
	}

}
