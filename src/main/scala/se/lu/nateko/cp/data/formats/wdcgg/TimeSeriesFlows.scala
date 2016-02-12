package se.lu.nateko.cp.data.formats.wdcgg

import akka.stream.scaladsl.Flow

object TimeSeriesFlows{

}

class TimeSeriesFlows(parser: TimeSeriesParser) {

	val wdcggParsingFlow: Flow[String, Array[AnyRef], Unit] = Flow[String]
			.scan(TimeSeriesParser.seed)(parser.parseLine)
			.dropWhile(acc => !acc.isOnData || acc.cells.isEmpty)
			.map(_.cells)
}
