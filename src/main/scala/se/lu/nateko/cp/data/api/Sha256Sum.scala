package se.lu.nateko.cp.data.api

import java.util.Base64
import scala.util.Try
import java.util.Arrays
import javax.xml.bind.DatatypeConverter

class Sha256Sum(private val bytes: Array[Byte]) {

	assert(bytes.length == 32, "SHA-256 hash sum must be 32 bytes long")

	def base64: String = Base64.getEncoder.encodeToString(bytes)
	def base64Url: String = Base64.getUrlEncoder.encodeToString(bytes)
	def hex: String = DatatypeConverter.printHexBinary(bytes)

	override def equals(other: Any): Boolean =
		if(other.isInstanceOf[Sha256Sum])
			Arrays.equals(bytes, other.asInstanceOf[Sha256Sum].bytes)
		else false

	override def hashCode: Int = Arrays.hashCode(bytes)

	override def toString: String = base64Url
}

object Sha256Sum{

	def fromBase64(hash: String): Try[Sha256Sum] = Try{
		new Sha256Sum(Base64.getDecoder.decode(hash))
	}

	def fromBase64Url(hash: String): Try[Sha256Sum] = Try{
		new Sha256Sum(Base64.getUrlDecoder.decode(hash))
	}

	def fromHex(hash: String): Try[Sha256Sum] = Try{
		new Sha256Sum(DatatypeConverter.parseHexBinary(hash))
	}
}
