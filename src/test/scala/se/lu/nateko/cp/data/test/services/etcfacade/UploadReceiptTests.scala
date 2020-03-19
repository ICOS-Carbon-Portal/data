package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.meta.core.crypto.Md5Sum
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import se.lu.nateko.cp.data.services.etcfacade.UploadReceipt
import se.lu.nateko.cp.data.services.etcfacade.UploadReceiptCrypto
import java.time.Instant

class UploadReceiptTests extends AnyFunSpec{
	def makeReceipt = {
		val md5 = Md5Sum.fromHex("0102030405060708090a0b0c0d0e0f10").get
		val file = EtcFilename.parse("FA-Lso_EC_201202040437_L03_F12.csv").get
		UploadReceipt(Instant.now, file, md5)
	}

	describe("UploadReceiptCrypto"){
		val crypto = new UploadReceiptCrypto("blabla")

		it("Encrypts a valid UploadReceipt to base64url-encoded string"){
			val receiptTxt = crypto.encrypt(makeReceipt)
			info(s"Got $receiptTxt")
		}

		it("Performs correct encryption/decryption round trip"){
			val receipt = makeReceipt
			val encrypted = crypto.encrypt(receipt)
			val decrypted = crypto.decrypt(encrypted).get
			assert(receipt === decrypted)
		}
	}
}