package se.lu.nateko.cp.data.api

import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import java.nio.file.Path
import java.nio.file.Files

object Utils {

	def waitForAll(futures: TraversableOnce[Future[Any]])(implicit exec: ExecutionContext): Future[Unit] = {
		val safeFutures: TraversableOnce[Future[Any]] = futures.map(_.recover{case _ => null})
		Future.sequence(safeFutures).map(_ => ())
	}

	def waitForAll(futures: Future[Any]*)(implicit exec: ExecutionContext): Future[Unit] = waitForAll(futures)

	def iterateChildren[T](folder: Path, glob: Option[String] = None)(eagerExtractor: Iterator[Path] => T): T = {
		import scala.collection.JavaConverters._

		if(Files.exists(folder) && Files.isDirectory(folder)){
			val dirStream = glob.fold(Files.newDirectoryStream(folder))(Files.newDirectoryStream(folder, _))
			try{
				eagerExtractor(dirStream.iterator.asScala)
			} finally{
				dirStream.close()
			}
		} else eagerExtractor(Iterator.empty)
	}
}