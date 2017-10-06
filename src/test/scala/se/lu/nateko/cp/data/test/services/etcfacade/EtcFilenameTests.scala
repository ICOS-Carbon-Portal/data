package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import se.lu.nateko.cp.meta.core.etcupload.DataType
import java.time.LocalDate
import java.time.LocalTime

class EtcFilenameTests extends FunSuite{

	private val ec = "FA-Lso_EC_201202040437_L3_F12.csv"
	private val bm = "BE-Lon_BM_20170815_L99_F1.dat"

	def testBad(fn: String, reason: String) = {
		test(s"$fn is not a valid filename ($reason)"){
			assert(EtcFilename.parse(fn).isFailure)
		}
	}

	def testGood(fn: String) = {
		test(fn + " is a valid filename"){
			assert(EtcFilename.parse(fn).isSuccess)
		}
	}

	testGood(bm)
	testGood(bm.replace("dat", "zip"))
	testGood(bm.replace("dat", "bin"))
	testBad(bm.replace("_", "-"), "must use underscores")
	testBad(bm.replace("20170815", "201708151134"), "time only allowed in EC files")

	test(ec + " is a valid EC filename with time"){
		val fTry = EtcFilename.parse(ec)

		val f = fTry.get

		assert(f.station.id === "FA-Lso")

		assert(f.loggerNumber === 3)

		assert(f.fileNumber === 12)

		assert(f.dataType === DataType.EC)

		assert(f.date === LocalDate.parse("2012-02-04"))

		assert(f.timeOrDatatype === Left(LocalTime.parse("04:37")))
	}

	testBad(ec.replace(".csv", ".blabla"), "too long file extension")
	testBad(ec.replace(".csv", ".xxx"), "unsupported file extension")
	testBad(ec.replace("-Lso", "-lso"), "bad station id format")
	testBad(ec.replace("FA-Lso", "FAA-Lso"), "bad station id format")
	testBad(ec.replace("_L3", ""), "logger number missing")
	testBad(ec.replace("EC", "XX"), "bad data type")
	testBad(ec.replace("201202040437", "20120204"), "EC files must have time")
}
