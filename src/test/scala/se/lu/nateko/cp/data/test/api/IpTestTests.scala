package se.lu.nateko.cp.data.test.api

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.api.IpTest

class IpTestTests extends AnyFunSpec{
	private val ip1 = "0.0.0.0"
	private val ip2 = "255.255.255.255"
	//  12 is 0000 1100 binary
	// 123 is 0111 1011 binary
	//  96 is 0110 0000 binary
	private val ip3 = "1.12.123.234"
	private val range4 = "1.12.123.0/24"
	private val range5 = "1.12.96.0/18"
	private val range6 = "1.0.0.0/11"

	describe("PlainIPv4"):
		for ip <- Seq(ip1, ip2, ip3) do
			it(s"correctly identifies IP $ip as equal to itself"):
				assert(IpTest.parse(ip).test(ip))

		it("distinguishes between different IPs"):
			Seq(
				"128.234.145.18" -> "129.234.145.18",
				"128.234.145.18" -> "128.233.145.18",
				"128.234.145.18" -> "128.234.17.18",
				"128.234.145.18" -> "128.234.145.82",
			).foreach: (a1, a2) =>
				assert(IpTest.parse(a1).test(a2) === false)

	describe("IPv4Range"):
		for range <- Seq(range4, range5, range6) do
			it(s"correctly identifies IP $ip3 to belong to IP range $range"):
				assert(IpTest.parse(range).test(ip3))

		Seq(
			ip3 -> "1.12.96.0/24",
			"1.32.0.0" -> range6
		).foreach: (ip, range) =>
			it(s"correctly claims that IP $ip does not belong to IP range $range"):
				assert(IpTest.parse(range).test(ip) === false)

}
