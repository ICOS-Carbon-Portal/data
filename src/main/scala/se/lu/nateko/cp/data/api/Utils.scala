package se.lu.nateko.cp.data.api

import java.nio.file.Path
import java.nio.file.Files

import akka.http.scaladsl.model.HttpResponse
import akka.stream.Materializer
import scala.concurrent.duration.DurationInt
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

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

	def responseAsString(resp: HttpResponse)(implicit mat: Materializer): Future[String] = {
		import mat.executionContext
		resp.entity.toStrict(3.seconds)
				.map(strict => strict.data.decodeString("UTF-8"))
				.recover{case _: Throwable => resp.status.toString}
	}
}
