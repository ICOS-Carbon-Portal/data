package se.lu.nateko.cp.data.streams

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import scala.concurrent.Future
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

trait FileFormatValidator[T]:

	val MagicLength: Int
	val MagicDict: Map[ByteString, T]

	def assertFormat(empty: T, invalid: T)(using ExecutionContext): Sink[ByteString, Future[T]] = 
		Flow[ByteString]
		.scan(ByteString.empty)(_ ++ _)
		.dropWhile(_.length < MagicLength)
		.toMat(Sink.headOption)(Keep.right)
		.mapMaterializedValue(
			_.map(
				_.fold(empty)(b =>
					MagicDict.getOrElse(b.take(MagicLength), invalid)
				)
			)
		)

	def parseHex(hex: String): ByteString = ByteString(Sha256Sum.parseHexArray(hex))
