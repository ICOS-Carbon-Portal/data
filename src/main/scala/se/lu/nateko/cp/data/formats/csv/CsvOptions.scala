package se.lu.nateko.cp.data.formats.csv

class CsvOptions(
	val sep: Char,
	val quote: Char,
	val escape: Char
){
	assert(sep != quote, "Separator symbol and quote symbol must differ")
	assert(sep != escape, "Separator symbol and escape symbol must differ")
	assert(sep != '\u0000' && quote != '\u0000' && escape != '\u0000', "None of the special symbols can be '\\u0000'")
}

object CsvOptions{

	def default = new CsvOptions(
		sep = ',',
		quote = '"',
		escape = '"'
	)

	def tsv = new CsvOptions(
		sep = '\t',
		quote = '"',
		escape = '"'
	)
}

class CsvParsingException(msg: String) extends Exception(msg)
