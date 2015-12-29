package se.lu.nateko.cp.data.streams

import java.io.OutputStream
import org.slf4j.LoggerFactory

/**
 * Performs the cleanup when close() method is called, after closing the inner stream.
 */
class OutputStreamWithCleanup(inner: OutputStream, cleanup: () => Unit) extends OutputStream{

	private[this] val logger = LoggerFactory.getLogger(getClass)

	override def close(): Unit = {
		try{
			logger.debug(s"Will close the inner stream now...")
			inner.close()
			logger.debug(s"Inner stream closed.")
		} finally{
			cleanup()
			logger.debug(s"Cleanup done.")
		}
	}

	override def flush(): Unit = {
		inner.flush()
	}

	override def write(b: Array[Byte]): Unit = {
		logger.debug(s"Writing ${b.length} bytes ...")
		inner.write(b)
		logger.debug(s"Done writing!")
	}

	override def write(b: Array[Byte], off: Int, len: Int): Unit = {
		logger.debug(s"Writing $len bytes with offset $off")
		inner.write(b, off, len)
		logger.debug(s"Done writing!")
	}

	override def write(b: Int): Unit = {
		inner.write(b)
	}
}
