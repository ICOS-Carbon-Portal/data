package se.lu.nateko.cp.data.formats

abstract class SimpleCsvStreams(separator: String) extends StandardCsvStreams {
	type ParserAcc = SimpleCsvParser.Accumulator

	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser[ParserAcc] =
		new SimpleCsvParser(format.colsMeta, separator)
	def seed = SimpleCsvParser.seed
}
