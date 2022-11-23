package se.lu.nateko.cp.data.streams

import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.ExecutionContext
import scala.concurrent.Future


object ZipValidator:
	import Result.*
	import ZipEntryFlow.Unzipper

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

	// type ValidatedZipChunk = (ByteString, Result)
	// private val ValidationZero: ValidatedZipChunk = ByteString.empty -> NoData

	// val zipWithValidation: Flow[ByteString, ValidatedZipChunk, NotUsed] = Flow[ByteString]
	// 	.groupedWeighted(MagicLength)(_.length)
	// 	.scan[ValidatedZipChunk](ValidationZero){
	// 		case ((_, res0), bsSeq) =>
	// 			val one = bsSeq.reduce(_ ++ _)
	// 			val res = if res0 == NoData then MagicDict.getOrElse(one.take(MagicLength), Invalid) else res0
	// 			one -> res
	// 	}
	// 	.drop(1)

	def unzipIfValidOrBypass(decoder: Unzipper): Unzipper = Flow.apply[ByteString]
		.groupedWeighted(MagicLength)(_.length)
		.map(_.reduce(_ ++ _))
		.flatMapPrefix(1){bsSeq =>
			val prefixFlow = Flow.apply[ByteString].concat(Source(bsSeq))
			val flow =
				if MagicDict.get(bsSeq.head.take(MagicLength)).contains(Valid)
				then decoder
				else Flow.apply[ByteString]
			prefixFlow.via(flow)
		}
