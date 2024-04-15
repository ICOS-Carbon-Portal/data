package se.lu.nateko.cp.data.streams

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import scala.concurrent.Future
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

object NetCdfValidator extends FileFormatValidator[NetCdfValidator.Result]:
	enum Result:
		case Valid, Invalid, NoData

	val noDataResult = Result.NoData
	val invalidResult = Result.Invalid
	val MagicLength = 4
	val MagicDict = Seq(
		parseHex("43444601"), // hex for CDF01
		parseHex("43444602"), // hex for CDF02, netcdf v2 files
		parseHex("43444603"), // hex for CDF03, netcdf v3 files
		parseHex("43444603"), // hex for CDF04, netcdf v3 files
		parseHex("89484446")  // HDF format
	).map(_ -> Result.Valid).toMap
