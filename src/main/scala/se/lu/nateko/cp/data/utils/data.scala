package se.lu.nateko.cp.data.utils

import scala.collection.mutable.ArrayBuffer

object data:

	class BufferWithDefault[T](sizeHint: Int, defaultValue: T):
		private val buffer = ArrayBuffer.fill(sizeHint)(defaultValue)
		export buffer.apply

		def update(idx: Int, v: T): Unit =
			if buffer.size < idx + 1 then
				val extensionSize = 0.1 * buffer.size
				val iter = Iterator.fill(extensionSize.toInt)(defaultValue)
				buffer.appendAll(iter)
			buffer.update(idx, v)
