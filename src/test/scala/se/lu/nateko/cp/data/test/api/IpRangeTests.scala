package se.lu.nateko.cp.data.test.api

import org.scalatest.funspec.AnyFunSpec

class IpRangeTests extends AnyFunSpec {
	import se.lu.nateko.cp.data.api.IpTest

	private val ip1 = "0.0.0.0"
	private val ip2 = "255.255.255.255"
	private val ip3 = "1.12.123.234"
	private val ip4 = "1.12.123.0/24"
	private val ip5 = "1.12.96.0/18"
	private val ip6 = "1.0.0.0/11"

	describe(s"IPv4 test"):
		for ip <- Seq(ip1, ip2, ip3) do
			it(s"correctly identifies the ip $ip as equal to itself"):
				assert(IpTest.parse(ip).test(ip))

		for ip <- Seq(ip4, ip5, ip6) do
			it(s"correctly identifies the ip $ip as equivalent to the ip $ip3"):
				assert(IpTest.parse(ip).test(ip3))

}
