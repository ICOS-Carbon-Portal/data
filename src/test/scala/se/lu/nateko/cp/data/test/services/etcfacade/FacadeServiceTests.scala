package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.services.etcfacade.EtcFilename
import se.lu.nateko.cp.data.services.etcfacade.FacadeService
import java.time.LocalDate

class FacadeServiceTests extends FunSpec{

	describe("FacadeService.slot"){

		import FacadeService.{slot, HalfHourSlot}

		def testSlot(slotNum: Int, date: String, file: String) = {
			it(s"Gives slot $slotNum on $date for $file"){

				val fn = EtcFilename.parse(file).get

				assert(slot(fn) === Some(HalfHourSlot(LocalDate.parse(date), slotNum)))
			}
		}

		def testNoSlot(file: String) = {
			it("Gives no slot for " + file){
				assert(slot(EtcFilename.parse(file).get) === None)
			}
		}
		testSlot(0, "2015-07-08", "FA-Lso_EC_201507080027_L1_F1.csv")
		testSlot(1, "2015-07-08", "FA-Lso_EC_201507080107_L1_F1.csv")
		testSlot(46, "2015-07-08", "FA-Lso_EC_201507082323_L1_F1.csv")
		testSlot(47, "2015-07-08", "FA-Lso_EC_201507082346_L1_F1.csv")
		testSlot(47, "2015-07-07", "FA-Lso_EC_201507080014_L1_F1.csv")

		testNoSlot("FA-Lso_BM_20150708_L1_F1.csv")
	}
}
