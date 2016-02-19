package se.lu.nateko.cp.data.test

import java.io.File

object TestUtils {

	def getFileInTarget(fileName: String) = new File(getClass.getResource("/").getFile + fileName)

}
