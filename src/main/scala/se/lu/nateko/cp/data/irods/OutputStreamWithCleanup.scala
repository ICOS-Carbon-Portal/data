package se.lu.nateko.cp.data.irods

import java.io.OutputStream
import org.slf4j.LoggerFactory

/**
 * Performs the cleanup when close() method is called, after closing the inner stream.
 */
private class OutputStreamWithCleanup(inner: OutputStream, cleanup: () => Unit) extends OutputStream{

	private[this] val logger = LoggerFactory.getLogger(getClass)

	override def close(): Unit = {
		try{
			inner.close()
		} finally{
			cleanup()
		}
	}

	override def flush(): Unit = {
		inner.flush()
	}

	override def write(b: Array[Byte]): Unit = {
		inner.write(b)
	}

	override def write(b: Array[Byte], off: Int, len: Int): Unit = {
		logger.debug(s"Writing $len bytes")
		inner.write(b, off, len)
	}

	override def write(b: Int): Unit = {
		inner.write(b)
	}
}
