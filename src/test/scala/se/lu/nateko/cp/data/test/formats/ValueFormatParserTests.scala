package se.lu.nateko.cp.data.test.formats

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.formats._
import java.util.Locale

class ValueParserTests extends FunSpec{

	private [this] val parser = new ValueFormatParser(Locale.UK)

	describe("ValueFormatParser with UK Locale"){

		it("Gives identical results for Iso8601Date and EtcDate parsing when it should"){
			assert(parser.parse("2011-03-15", Iso8601Date) === parser.parse("15/3/2011", EtcDate))
		}

		describe("Iso8601TimeOfDay parsing"){
			it("parses proper value correctly"){
				assert(parser.parse("00:01:00", Iso8601TimeOfDay) === 60)
				assert(parser.parse("00:10", Iso8601TimeOfDay) === 600)
			}
	
			it("supports non-zero-padded-hours"){
				assert(parser.parse("0:01:00", Iso8601TimeOfDay) === 60)
			}
	
			it("supports non-standard time of day between 24 and 25 hours"){
				assert(parser.parse("24:01:01", Iso8601TimeOfDay) === 24 * 3600 + 61)
			}
		}
	}
}