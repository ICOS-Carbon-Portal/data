package se.lu.nateko.cp.data.test.services.etcfacade

import java.time.LocalDate

import org.scalatest.FunSuite

import se.lu.nateko.cp.data.services.etcfacade.EtcFilename

class EtcFilenameToEcDailyTests extends FunSuite{

	def dateOpt(file: String): Option[LocalDate] =
		EtcFilename.parse(file).toOption.flatMap(_.toEcDaily).map(_.date)

	def testSlot(date: String, file: String) =
		test(s"Gives EC daily file date $date for $file"){
			assert(dateOpt(file) === Some(LocalDate.parse(date)))
		}

	def testNoSlot(file: String) =
		test("Gives no EC daily file for " + file){
			assert(dateOpt(file) === None)
		}

	testSlot("2015-07-08", "FA-Lso_EC_201507080027_L1_F1.csv")
	testSlot("2015-07-08", "FA-Lso_EC_201507080107_L1_F1.csv")
	testSlot("2015-07-08", "FA-Lso_EC_201507082323_L1_F1.csv")
	testSlot("2015-07-08", "FA-Lso_EC_201507082346_L1_F1.csv")
	testSlot("2015-07-07", "FA-Lso_EC_201507080014_L1_F1.csv")

	testNoSlot("FA-Lso_BM_20150708_L1_F1.csv")
}
