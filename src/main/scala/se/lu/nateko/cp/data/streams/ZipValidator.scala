package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.ExecutionContext
import scala.concurrent.Future


object ZipValidator:
	import Result.*
	private val MagicLength = 4

	private val MagicDict = Map(
		parseHex("504B0304") -> Valid,
		parseHex("504B0506") -> EmptyZip,
		parseHex("504B0708") -> SpannedZip
	)

	enum Result:
		case Valid, Invalid, SpannedZip, EmptyZip, NoData

	def parseHex(hex: String): ByteString = ByteString(Sha256Sum.parseHexArray(hex))

	def assertZipFormat(using ExecutionContext): Sink[ByteString, Future[Result]] = 
		Flow[ByteString]
		.scan(ByteString.empty)(_ ++ _)
		.dropWhile(_.length < MagicLength)
		.toMat(Sink.headOption)(Keep.right)
		.mapMaterializedValue(
			_.map(
				_.fold(NoData)(b =>
					MagicDict.getOrElse(b.take(MagicLength), Invalid)
				)
			)
		)
