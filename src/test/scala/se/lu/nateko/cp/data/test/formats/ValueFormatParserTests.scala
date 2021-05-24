package se.lu.nateko.cp.data.test.formats

import se.lu.nateko.cp.data.api.CpDataParsingException
import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.formats._
import java.util.Locale

class ValueParserTests extends AnyFunSpec{

	private [this] val parser = ValueFormatParser

	describe("ValueFormatParser"){
		//this must not affect the results, and that is what is being tested here
		Locale.setDefault(Locale.FRENCH)

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

		describe("32-bit float parsing"){
			def testCase(s: String, expect: Float) = {
				it("parses " + s){
					assert(parser.parse(s, FloatValue) === expect)
				}
			}
			testCase("3.584732", 3.584732f)
			testCase("0.000001", 1e-6f)
			testCase("1e-6", 1e-6f)
			testCase("-3.154e-1", -3.154e-1f)

			it("fails on 1,48348"){
				assertThrows[CpDataParsingException]{
					parser.parse("1,48348", FloatValue)
				}
			}
		}
	}
}