package se.lu.nateko.cp.data.streams

import akka.NotUsed
import akka.stream.FlowShape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Merge
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.concurrent.ExecutionContext
import scala.concurrent.Future


object ZipValidator extends FileFormatValidator[ZipValidator.Result]:
	enum Result:
		case Valid, Invalid, SpannedZip, EmptyZip, NoData

	import ZipEntryFlow.Unzipper
	import Result.*

	val noDataResult = NoData
	val invalidResult = Invalid
	val MagicLength = 4
	val MagicDict = Map(
		parseHex("504B0304") -> Valid,
		parseHex("504B0506") -> EmptyZip,
		parseHex("504B0708") -> SpannedZip
	)

	private type ValidatedZipChunk = (ByteString, Result)
	private val ValidationZero: ValidatedZipChunk = ByteString.empty -> NoData

	private val zipWithValidation: Flow[ByteString, ValidatedZipChunk, NotUsed] = Flow[ByteString]
		.groupedWeighted(MagicLength)(_.length)
		.scan[ValidatedZipChunk](ValidationZero){
			case ((_, res0), bsSeq) =>
				val one = bsSeq.reduce(_ ++ _)
				val res = if res0 == NoData then MagicDict.getOrElse(one.take(MagicLength), Invalid) else res0
				one -> res
		}
		.drop(1)

	def unzipIfValidOrBypass(decoder: Unzipper): Unzipper = Flow.fromGraph(GraphDSL.create() {
		implicit b =>
		import GraphDSL.Implicits.*

		val validated = b.add(zipWithValidation)
		val broadcast = b.add(Broadcast[ValidatedZipChunk](2))
		val merge = b.add(Merge[ByteString](2, false))

		validated.out ~> broadcast.in
		broadcast.out(0).collect{case (bs, Valid) => bs} ~> decoder ~> merge.in(0)
		broadcast.out(1).collect{case (bs, validation) if validation != Valid => bs} ~> merge.in(1)

		FlowShape(validated.in, merge.out)
	})
