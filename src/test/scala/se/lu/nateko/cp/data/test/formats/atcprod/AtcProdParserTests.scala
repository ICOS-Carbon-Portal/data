package se.lu.nateko.cp.data.test.formats.atcprod

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.formats.atcprod.AtcProdParser.disambiguateColumnNames

class AtcProdParserTests extends FunSuite{

	test("AtcProdParser.disambiguateColumnNames disambiguates as expected"){
		val input = (
			"Site;SamplingHeight;Year;Month;Day;Hour;Minute;DecimalDate;" +
			"AP;Stdev;NbPoints;Flag;QualityId;" +
			"RH;Stdev;NbPoints;Flag;QualityId;" +
			"AT;Stdev;NbPoints;Flag;QualityId;" +
			"WD;Stdev;NbPoints;Flag;QualityId;" +
			"WS;Stdev;NbPoints;Flag;QualityId;InstrumentId"
		).split(";")

		val res = disambiguateColumnNames(input)

		val groups = res.drop(8).sliding(5, 5).toIndexedSeq
		assert(groups(0) === expectedColGroup("AP"))
		assert(groups(1) === expectedColGroup("RH"))
		assert(groups(2) === expectedColGroup("AT"))
		assert(groups(3) === expectedColGroup("WD"))
		assert(groups(4) === expectedColGroup("WS"))
		assert(groups(5) === Array("InstrumentId"))
	}

	def expectedColGroup(mainVar: String): Array[String] = mainVar +:
		Array("Stdev", "NbPoints", "Flag", "QualityId").map(_ + "_" + mainVar)

	test("AtcProdParser.disambiguateColumnNames keeps unique column lists intact"){
		val input = "a;b;c;d;e;f;blabla;some;more;columns;Stdev;NbPoints;Flag;QualityId;InstrumentId".split(";")
		assert(input === disambiguateColumnNames(input))
	}
}
