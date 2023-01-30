package se.lu.nateko.cp.data.utils

import java.nio.file.Path
import java.net.URI

object io:

	extension(path: Path)
		def withSuffix(suff: String) = path.resolveSibling(path.getFileName().toString + suff)

	extension(uri: URI)
		/**
		  * @return Second-level domain of this URI's host, in case the host is not an IP address. Otherwise, full host.
		  */
		def hostL2: String =
			if uri.hasIpAddressHost then uri.getHost
			else takeL2Domain(uri.getHost)

		def hasIpAddressHost: Boolean =
			val chars = uri.getHost.toCharArray
			(chars.contains('[') && chars.contains(']') || //IPv6
			chars.forall{c => c == '.' || c.isDigit}) //IPv4


	def takeL2Domain(host: String): String = host.split('.').takeRight(2).mkString