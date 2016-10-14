package se.lu.nateko.cp.data.formats

trait ParsingAccumulator {

	def error: Option[Throwable]

	def isOnData: Boolean

}
