package se.lu.nateko.cp.data.api

sealed trait IpTest:
	def test(ipv4: String): Boolean

object IpTest:
	def parse(ipOrRange: String): IpTest =
		if ipOrRange.contains("/") then IPv4Range(ipOrRange) else PlainIPv4(ipOrRange)

	class PlainIPv4(ip: String) extends IpTest:
		override def test(ipv4: String): Boolean = ipv4 == ip

	class IPv4Range(range: String) extends IpTest:
		private val (addr, mask): (Long, Long) =
			val Seq(ipStr, maskStr) = range.split('/').toSeq
			val maskSize = maskStr.toShort
			assert(maskSize < 32, "subnet mask must be less than 32 bits wide")
			val mask = 0xffffffffL << (32 - maskSize)
			val addr = parseIpV4(ipStr) & mask
			addr -> mask

		private def parseIpV4(ipv4: String): Long =
			val bytes = ipv4.split('.').map(_.toShort)
			val errMsg = "IPv4 must consist of 4 dot-separated numbers between 0 and 255"
			assert(bytes.length == 4, errMsg)
			bytes.foreach: byte =>
				assert(byte < 256, errMsg)
			var binary = 0L
			bytes.foreach: byte =>
				binary <<= 8
				binary |= byte
			binary

		override def test(ipv4: String): Boolean =
			try (parseIpV4(ipv4) & mask) == addr
			catch case _ => false
