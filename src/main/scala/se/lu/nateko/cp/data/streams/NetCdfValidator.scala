package se.lu.nateko.cp.data.streams

import scala.concurrent.ExecutionContext
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import scala.concurrent.Future
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

enum NcResult:
	case Valid, Invalid, NoData

object NetCdfValidator extends FileFormatValidator[NcResult]:
	import NcResult.*

	val MagicLength = 4
	val MagicDict = Map(
		parseHex("43444601") -> Valid, // hex for CDF01
		parseHex("43444602") -> Valid, // hex for CDF02, netcdf v2 files
		parseHex("43444603") -> Valid, // hex for CDF03, netcdf v3 files
		parseHex("43444603") -> Valid, // hex for CDF04, netcdf v3 files
		parseHex("89484446") -> Valid  // HDF format
	)
