package se.lu.nateko.cp.data.test

import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import scala.io.Source
import java.nio.file.Files
import java.nio.file.Paths
import java.security.MessageDigest

object HashRecovery {

	val src = "/home/oleg/Downloads/FI-Sii_BM_20171125_L06_F01_new.csv"
	val expectedHash = Sha256Sum.fromHex("38261f5d4fdbb51825c24041ffe25bb94ca7d7f2f400ebccccb30c6576d63171").get

	def run(): Unit = {
		val bytes = Files.readAllBytes(Paths.get(src))

		var i = 0
		val md = MessageDigest.getInstance("SHA-256")
		def hash = new Sha256Sum(md.clone().asInstanceOf[MessageDigest].digest())

		while(i < bytes.length && expectedHash != hash){
			md.update(bytes(i))
			i += 1
			if(i % 10000 == 0) println(s"Done $i bytes, hash is ${hash.hex}")
		}

		if(expectedHash == hash){
			println(s"Success after $i bytes")
		} else println(s"Could not recover hash, final hash after $i bytes is ${hash.hex}")
	}
}
