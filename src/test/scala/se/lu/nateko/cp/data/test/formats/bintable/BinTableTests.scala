package se.lu.nateko.cp.data.test.formats.bintable

import org.scalatest.FunSuite
import se.lu.nateko.cp.data.formats.bintable._
import se.lu.nateko.cp.data.formats.netcdf.PlainColumn
import se.lu.nateko.cp.data.test.TestUtils._

class BinTableTest extends FunSuite{

	test("Simple write, then read test"){
		val file = getFileInTarget("binTableWriterTest.cpb")

		val n = 100000

		val schema = new Schema(Array(DataType.INT, DataType.DOUBLE, DataType.FLOAT), n.toLong)

		val writer = new BinTableWriter(file, schema)

		for(i <- 1 to n){
			writer.write((i, (i.toLong << 16).toDouble, i.toFloat))
		}

		writer.close()

		val reader = new BinTableReader(file, schema)

		val first = PlainColumn(reader.read(0, 0, n)).flatMap(_.asInt).get.values
		val second = PlainColumn(reader.read(1, 0, n)).flatMap(_.asDouble).get.values
		val third = PlainColumn(reader.read(2, 0, n)).flatMap(_.asFloat).get.values

		val size = first.zip(second).zip(third).size
		reader.close()

		assert(size === n)
	}
	
	test("Write with a string column, then read"){
		val file = getFileInTarget("binTableWriterStringTest.cpb")

		val schema = new Schema(Array(DataType.INT, DataType.STRING), 4)

		val writer = new BinTableWriter(file, schema)

		writer.write((1, "bla"))
		writer.write((2, "bla"))
		writer.write((3, "meme"))
		writer.write((4, "meme"))

		writer.close()

		val reader = new BinTableReader(file, schema)

		val tbl = for(
			plain1 <- PlainColumn(reader.read(0));
			int1 <- plain1.asInt;
			plain2 <- PlainColumn(reader.read(1));
			int2 <- plain2.asInt
		) yield{
			val stringCol = int2.map(reader.getStringForIndex)
			int1.values.zip(stringCol.values).toArray
		}

		reader.close()

		assert(tbl.get === Array((1, "bla"), (2, "bla"), (3, "meme"), (4, "meme")))
	}

}
