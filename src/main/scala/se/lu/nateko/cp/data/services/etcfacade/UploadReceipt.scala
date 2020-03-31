package se.lu.nateko.cp.data.services.etcfacade

import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.time.Instant
import java.time.format.DateTimeFormatterBuilder
import java.util.Arrays
import java.util.Base64

import scala.util.Try

import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import se.lu.nateko.cp.data.api.Utils
import se.lu.nateko.cp.meta.core.crypto.{Md5Sum, Sha256Sum}

case class UploadReceipt(timeStamp: Instant, file: EtcFilename, md5: Md5Sum){
	def report: String = {
		val time = new DateTimeFormatterBuilder().appendInstant(0).toFormatter.format(timeStamp)
		s"""ICOS CP ETC logger facade file upload receipt:
		|Upload time:  $time
		|File name:    $file
		|MD5 checksum: ${md5.hex}
		|""".stripMargin
	}
}

class UploadReceiptCrypto(secret: String){

	private[this] val ivSize = 16

	private val key: SecretKey = {
		val salt = Array[Byte](42)
		val keySpec = new PBEKeySpec(secret.toCharArray, salt, 100, 128)
		val keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1")
		val tmp = keyFactory.generateSecret(keySpec)
		new SecretKeySpec(tmp.getEncoded, "AES")
	}

	private def getCipher = Cipher.getInstance("AES/CBC/PKCS5Padding")

	def toBytes(ur: UploadReceipt): Array[Byte] = {
		val timeArr = Array.ofDim[Byte](8)
		val bb = ByteBuffer.wrap(timeArr)
		bb.putLong(ur.timeStamp.toEpochMilli)
		timeArr ++ ur.md5.getBytes ++ ur.file.toString.getBytes(StandardCharsets.UTF_8)
	}

	private def fromBytes(bytes: Array[Byte]): Try[UploadReceipt] = Try{
		val bb = ByteBuffer.wrap(bytes, 0, 8)
		val timeStamp = Instant.ofEpochMilli(bb.getLong)
		val md5arr = Arrays.copyOfRange(bytes, 8, 24)
		val md5Hex = md5arr.iterator.map(Sha256Sum.formatByte).mkString

		val fileName = new String(bytes, 24, bytes.length - 24, StandardCharsets.UTF_8)

		for(
			md5 <- Md5Sum.fromHex(md5Hex);
			file <- EtcFilename.parse(fileName)
		) yield
			UploadReceipt(timeStamp, file, md5)
	}.flatten

	def encrypt(ur: UploadReceipt): String = {
		val cipher = getCipher
		val iv = Array.ofDim[Byte](ivSize)
		(new SecureRandom).nextBytes(iv)
		cipher.init(Cipher.ENCRYPT_MODE, key, new IvParameterSpec(iv))
		val bytes = cipher.doFinal(toBytes(ur))
		Base64.getUrlEncoder.withoutPadding.encodeToString(iv ++ bytes)
	}

	def decrypt(ur: String): Try[UploadReceipt] = Try{
		val encrypted = Base64.getUrlDecoder.decode(ur)
		val iv = encrypted.take(ivSize)
		val cipher = getCipher
		cipher.init(Cipher.DECRYPT_MODE, key, new IvParameterSpec(iv))
		cipher.doFinal(encrypted.drop(ivSize))
	}.flatMap(fromBytes)

	def encryptNow(file: EtcFilename, md5: Md5Sum): String =
		encrypt(UploadReceipt(Instant.now, file, md5))

}
