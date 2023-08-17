package se.lu.nateko.cp.data.test.api

import org.scalatest.funspec.AnyFunSpec

class IpRangeTests extends AnyFunSpec {
	import se.lu.nateko.cp.data.api.IpTest

	private val ip1 = "255.255.255.255"
	private val ip2 = "0.0.0.0"
	private val ip3 = "128.12.201.101/24"
	private val ips = Seq(ip1, ip2, ip3)

	describe(s"IPv4 parser"):
		for ip <- ips do
			it(s"It parses the ip $ip"):
				assert(IpTest.parse(ip).test(ip))

}
