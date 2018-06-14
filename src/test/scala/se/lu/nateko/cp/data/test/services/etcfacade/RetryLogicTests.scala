package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.FunSpec

import java.time.LocalTime
import scala.concurrent.duration.DurationInt
import se.lu.nateko.cp.data.services.etcfacade.RetryLogic

class RetryLogicTests extends FunSpec{

	describe("timeToNextTick"){
		import RetryLogic.timeToNextTick

		it("gives expected result for next-day must-tick after longer than the retry interval"){
			val dur = timeToNextTick(LocalTime.of(15,0), LocalTime.of(4,0), 12.hours)
			assert (dur === 1.hour)
		}

		it("gives expected result for next-day must-tick after shorter than the retry interval"){
			val dur = timeToNextTick(LocalTime.of(18,0), LocalTime.of(4,0), 12.hours)
			assert (dur === 10.hour)
		}

		it("gives expected result for same-day must-tick after longer than the retry interval"){
			val dur = timeToNextTick(LocalTime.of(5,0), LocalTime.of(20,0), 12.hours)
			assert (dur === 3.hour)
		}

		it("gives expected result for same-day must-tick after shorter than the retry interval"){
			val dur = timeToNextTick(LocalTime.of(5,0), LocalTime.of(10,0), 12.hours)
			assert (dur === 5.hour)
		}
	}

	describe("withinHalfHour"){
		import RetryLogic.withinHalfHour

		it("returns 'true' for 13:31 and 14:00"){
			assert(withinHalfHour(LocalTime.of(13,31), LocalTime.of(14,0)))
		}

		it("returns 'false' for 13:29 and 14:00"){
			assert(!withinHalfHour(LocalTime.of(13,29), LocalTime.of(14,0)))
		}

		it("returns 'true' for 14:00 and 13:31"){
			assert(withinHalfHour(LocalTime.of(14,0), LocalTime.of(13,31)))
		}

		it("returns 'false' for 14:00 and 13:29"){
			assert(!withinHalfHour(LocalTime.of(14,0), LocalTime.of(13,29)))
		}
	}
}
