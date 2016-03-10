package se.lu.nateko.cp.data.formats.wdcgg

object TimeSeriesParser {

	case class Accumulator(
			headerLength: Int,
			totLength: Int,
			columnNames: Array[String],
			lineNumber: Int,
			cells: Array[String]
		){
		def isOnData = (headerLength > 0 && lineNumber > headerLength)
		def incrementLine = copy(lineNumber = lineNumber + 1)
	}

	private val headerPattern = """^C\d\d""".r.unanchored
	private val nonEmptyHeaderLinePattern = """^C\d\d (.+)""".r.unanchored
	private val headerKvPattern = "^([^:]+): ?(.*)".r
	private val totLinesPattern = """^C\d\d TOTAL LINES: (\d+)""".r.unanchored
	private val headLinesPattern = """^C\d\d HEADER LINES: (\d+)""".r.unanchored
	private val wsPattern = "\\s+".r

	def seed = Accumulator(0, 0, Array.empty, 0, Array.empty)

	def isHeaderLine(line: String): Boolean =
		headerPattern.findFirstIn(line).isDefined

	def parseLine(acc: Accumulator, line: String): Accumulator = {

		if(acc.headerLength > 0 && acc.lineNumber >= acc.headerLength)
			acc.copy(cells = wsPattern.split(line), lineNumber = acc.lineNumber + 1)

		else if(acc.headerLength == acc.lineNumber + 1)//the column names line
			acc.copy(columnNames = wsPattern.split(line).drop(1)).incrementLine

		else line match {
			case headLinesPattern(n) => acc.copy(headerLength = n.toInt).incrementLine
			case totLinesPattern(n) => acc.copy(totLength = n.toInt).incrementLine
			case _ if isHeaderLine(line) => acc.incrementLine
			case _ => acc
		}
	}

	private val headerKeys = Set(
		"STATION NAME", "COUNTRY/TERRITORY", "PARAMETER", "TIME INTERVAL",
		"MEASUREMENT UNIT", "MEASUREMENT METHOD", "SAMPLING TYPE", "TIME ZONE",
		"MEASUREMENT SCALE", "CONTRIBUTOR"
	)

	private val keyRenamings = Map("COUNTRY/TERITORY" -> "COUNTRY/TERRITORY")

	class HeaderAccumulator(lastKv: Option[(String, String)], kvPairs: Map[String, String]){

		def result: Map[String, String] = (lastKv match {
			case None => kvPairs
			case Some(kv) => kvPairs + kv
		}).filterKeys(headerKeys.contains)

		def addKv(key: String, value: String) = new HeaderAccumulator(Some((mapKey(key), value)), result)

		def append(value: String) = lastKv match{
			case Some((key, currValue)) => new HeaderAccumulator(Some((key, currValue + "\n" + value)), kvPairs)
			case _ => this
		}

		private def mapKey(key: String): String = keyRenamings.getOrElse(key, key)
	}

	def headerSeed = new HeaderAccumulator(None, Map.empty)

	def parseHeaderLine(acc: HeaderAccumulator, line: String): HeaderAccumulator = line match {
		case nonEmptyHeaderLinePattern(lineContent) => lineContent match{
			case headerKvPattern(key, value) => acc.addKv(key, value)
			case _ => acc.append(lineContent)
		}
		case _ => new HeaderAccumulator(None, acc.result)
	}
}

