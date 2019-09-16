package se.lu.nateko.cp.data.formats

abstract class SimpleCsvStreams(separator: String) extends StandardCsvStreams {
	
	def makeParser(format: ColumnsMetaWithTsCol): TextFormatParser =
		new SimpleCsvParser(format.colsMeta, separator)

}
