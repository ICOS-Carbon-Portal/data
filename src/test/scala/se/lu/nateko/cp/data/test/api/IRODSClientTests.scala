package se.lu.nateko.cp.data.test.api

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.api.IRODSClient

class IRODSClientTests extends AnyFunSpec:
	describe("readPages"):
		import IRODSClient.readPages
		it("returns full range for small file size"):
			assert(readPages(100, 1000).toSeq === Seq(0 -> 100))

		it("returns two equal segments for file twice the size of chunk size"):
			assert(readPages(100, 50).toSeq === Seq(0 -> 50, 50 -> 50))

		it("returns shorter segment if size not divisible by chunk size"):
			assert(readPages(100, 30).toSeq === Seq(0 -> 30, 30 -> 30, 60 -> 30, 90 -> 10))