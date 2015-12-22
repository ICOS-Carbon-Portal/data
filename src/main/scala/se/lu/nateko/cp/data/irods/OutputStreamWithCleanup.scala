package se.lu.nateko.cp.data.irods

import java.io.OutputStream
import scala.util.Try
import org.slf4j.LoggerFactory

/**
 * Wraps an OutputStream-producing factory and a cleanup callback.
 * Delays the possible exception at stream creation until OutputStream's methods get called.
 * Performs the cleanup when close() method is called, after closing the inner stream.
 */
private class OutputStreamWithCleanup(innerFactory: () => OutputStream, cleanup: () => Unit) extends OutputStream{

	private[this] val logger = LoggerFactory.getLogger(getClass)
	private[this] val inner: Try[OutputStream] = Try({
		logger.debug("Producing inner stream...")
		val inner = innerFactory()
		logger.debug("Produced inner stream.")
		inner
	})

	override def close(): Unit = {
		logger.debug("Closing stream...")
		try{
			if(inner.isSuccess){
				inner.get.close()
				logger.debug("Inner stream closed")
			}
		}catch{
			case e: Throwable =>
				logger.error("Failed to close the inner stream, rethrowing the exception")
				throw e
		} finally{
			cleanup()
			logger.debug("Cleanup done!")
		}
		logger.debug("Stream closing succeeded.")
	}

	override def flush(): Unit = {
		logger.debug(s"Flushing")
		if(inner.isSuccess) inner.get.flush()
	}

	override def write(b: Array[Byte]): Unit = {
		logger.debug(s"Writing ${b.length} bytes")
		if(inner.isSuccess) inner.get.write(b)
		else throw inner.failed.get
	}

	override def write(b: Array[Byte], off: Int, len: Int): Unit = {
		logger.debug(s"Writing $len bytes via the offset-supporting method")
		if(inner.isSuccess) inner.get.write(b, off, len)
		else throw inner.failed.get
	}

	override def write(b: Int): Unit = {
		logger.debug(s"Writing byte $b")
		if(inner.isSuccess) inner.get.write(b)
		else throw inner.failed.get
	}
}
