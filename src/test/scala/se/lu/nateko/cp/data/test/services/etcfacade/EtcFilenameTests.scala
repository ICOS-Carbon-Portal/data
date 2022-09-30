package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import se.lu.nateko.cp.meta.core.etcupload.DataType
import java.time.LocalDate
import java.time.LocalTime

class EtcFilenameTests extends AnyFunSpec{

	describe("Parsing"){
		val ec = "FA-Lso_EC_201202040437_L03_F12.csv"
		val bm = "BE-Lon_BM_20170815_L99_F01.dat"
		val heat = "FA-Lso_SAHEAT_20100603_L01_F02.txt"
		val phen = "BE-Lon_PHEN_202212040430_L03_F01.zip"
		val phenUgly = "BE-Lon_EC_202212040430_L03_F01_img.zip"

		def testBad(fn: String, reason: String) = {
			it(s"Parses $fn as not a valid filename ($reason)"){
				assert(EtcFilename.parse(fn).isFailure)
			}
		}

		def testGood(fn: String) = {
			it(s"Parses $fn as a valid filename"){
				assert(EtcFilename.parse(fn).isSuccess)
			}
		}

		def testRoundTrip(fn: String) = {
			it(s"Parses '$fn', giving EtcFilename with correct toString"){
				assert(EtcFilename.parse(fn).get.toString === fn)
			}
		}

		testGood(heat)
		testGood(bm)
		testGood(bm.replace("dat", "zip"))
		testGood(bm.replace("dat", "bin"))
		testGood(phen)
		testGood(phenUgly)
		testBad(bm.replace("_", "-"), "must use underscores")
		testBad(bm.replace("20170815", "201708151134"), "time only allowed in EC files")

		it(s"Parses $ec is a valid EC filename with time"){
			val fTry = EtcFilename.parse(ec)

			val f = fTry.get

			assert(f.station.id === "FA-Lso")

			assert(f.loggerNumber === 3)

			assert(f.fileNumber === 12)

			assert(f.dataType === DataType.EC)

			assert(f.date === LocalDate.parse("2012-02-04"))

			assert(f.time === Some(LocalTime.parse("04:37")))
		}

		testBad(ec.replace(".csv", ".blabla"), "too long file extension")
		testBad(ec.replace(".csv", ".xxx"), "unsupported file extension")
		testGood(ec.replace("-Lso", "-lso")) //because of historical CZ-wet
		testBad(ec.replace("FA-Lso", "FAA-Lso"), "bad station id format")
		testBad(ec.replace("_L03", ""), "logger number missing")
		testBad(ec.replace("EC", "XX"), "bad data type")
		testBad(ec.replace("201202040437", "20120204"), "EC files must have time")

		it("Parses daily EC files without time are if explicitly allowed"){
			assert(EtcFilename.parse("FA-Lso_EC_20120204_L03_F12.csv", true).isSuccess)
		}

		testRoundTrip(ec)
		testRoundTrip(bm)
	}

	describe("slot"){

		def testSlot(slotNum: Int, file: String) = {
			it(s"Gives slot $slotNum for $file"){

				val fn = EtcFilename.parse(file).get

				assert(fn.slot === Some(slotNum))
			}
		}

		def testNoSlot(file: String) = {
			it("Gives no slot for " + file){
				assert(EtcFilename.parse(file).get.slot === None)
			}
		}
		testSlot(0, "FA-Lso_EC_201507080027_L1_F1.csv")
		testSlot(1, "FA-Lso_EC_201507080107_L1_F1.csv")
		testSlot(46, "FA-Lso_EC_201507082323_L1_F1.csv")
		testSlot(47, "FA-Lso_EC_201507082346_L1_F1.csv")
		testSlot(47, "FA-Lso_EC_201507080014_L1_F1.csv")

		testNoSlot("FA-Lso_BM_20150708_L1_F1.csv")
	}
}
