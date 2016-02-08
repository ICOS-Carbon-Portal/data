package se.lu.nateko.cp.data.test.formats.csv

import org.scalatest.FunSpec
import se.lu.nateko.cp.data.formats.csv.CsvParser

class CsvParserTests extends FunSpec{

	import CsvParser._

	def parse(csv: String, parser: CsvParser): IndexedSeq[Accumulator] = {
		val lines = csv.stripMargin.trim.split("\n")
		lines.scanLeft(seed)(parser.parseLine).tail
	}

	def assertCells(acc: Accumulator, values: String*): Unit = {
		assert(acc.cells.toSeq === values.toSeq)
	}

	def assertStates(accs: Seq[Accumulator], values: State*): Unit = {
		assert(accs.map(_.lastState) === values.toSeq)
	}

	describe("Default CSV parser"){
		val parser = CsvParser.default

		it("Parses a plain CSV successfully"){
			val csv = """
				|c1,c2
				|v1,v2
			"""

			val accs = parse(csv, parser)
			assertStates(accs, Init, Init)
			assertCells(accs(0), "c1", "c2")
			assertCells(accs(1), "v1", "v2")
		}

		it("Supports quoted cells"){
			val csv = """
				|c1,c2
				|plain value,"nice, quoted value"
			"""
			val accs = parse(csv, parser)
			assertCells(accs(1), "plain value", "nice, quoted value")
		}

		it("Supports escaping in quoted cells"){
			val csv = """
				|c1,c2
				|"plain, quoted value","nice, ""escaped"" value"
			"""
			val accs = parse(csv, parser)
			assertCells(accs(1), "plain, quoted value", "nice, \"escaped\" value")
		}

		it("Supports values with a line break inside quoted cells"){
			val csv = """
				|c1,c2
				|"value with
				| a line break",plain value
			"""
			val accs = parse(csv, parser)
			assertCells(accs(2), "value with\n a line break", "plain value")
		}
	}
}