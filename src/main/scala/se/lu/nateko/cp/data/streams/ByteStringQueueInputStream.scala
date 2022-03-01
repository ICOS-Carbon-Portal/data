package se.lu.nateko.cp.data.streams

import java.io.InputStream
import java.util.concurrent.LinkedBlockingQueue
import akka.util.ByteString
import scala.jdk.CollectionConverters.CollectionHasAsScala
import java.io.IOException

class ByteStringQueueInputStream extends InputStream {

	private[this] var closed = false
	private[this] var inputDone = false
	private[this] var pointer: Int = 0
	private[this] var head: ByteString = null

	private[this] val q = new LinkedBlockingQueue[ByteString]()

	def append(bs: ByteString): Unit = {
		if(inputDone) throw new IllegalStateException("ByteString appending was finished, cannot append after that.")
		q.add(bs)
	}

	def finishAppending(): Unit = inputDone = true

	def size = q.size

	override def available(): Int = {
		val inHead = if(head == null) 0 else head.length - pointer
		inHead + q.asScala.map(_.length).sum
	}

	override def close(): Unit = {
		closed = true
		if(q.isEmpty)
			q.add(ByteString.empty) //to unblock potential other reading threads
		else
			q.clear()
	}

	override def read(): Int = {
		if(closed) throw new IOException("Reading from a closed stream")

		fetchHeadIfNeeded()

		if(headIsEmpty) -1 else {
			pointer += 1
			head(pointer - 1) & 0xff
		}
	}

	override def read(buff: Array[Byte], off: Int, len: Int): Int =
		if(len == 0)
			0

		else if(len < 0 || off < 0 || len > buff.length - off)
			throw new IndexOutOfBoundsException("Bad arguments to ByteStringQueueInputStream's read method")

		else if(closed)
			throw new IOException("Reading from a closed stream")

		else {
			fetchHeadIfNeeded()

			if(headIsEmpty) -1 else {

				var haveRead = 0
				var currOff = off

				while{
					val toRead = Math.min(len - haveRead, head.length - pointer)
					if(toRead > 0){
						head.drop(pointer).copyToArray(buff, currOff, toRead)
						pointer += toRead
						haveRead += toRead
						currOff += toRead
					}

					while(headIsEmpty && !q.isEmpty) fetchHead()
					haveRead < len && !headIsEmpty
				} do ()

				haveRead
			}
		}

	private def headIsEmpty: Boolean = head == null || pointer >= head.length

	private def fetchHead(): Unit = {
		head = q.take()
		pointer = 0
	}

	private def fetchHeadIfNeeded(): Unit = while(headIsEmpty && (!inputDone || !q.isEmpty)) fetchHead()
}
