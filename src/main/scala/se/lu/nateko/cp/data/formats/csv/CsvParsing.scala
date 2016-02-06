package se.lu.nateko.cp.data.formats.csv

import scala.collection.mutable.ArrayBuffer

object CsvParser{
	object State extends Enumeration{
		val Init, Text, Esc, Quote, Sep, Error = Value
		type State = Value
	}

	class Accumulator(val cells: Array[String], val lastState: State.State)

	def seed = new Accumulator(Array.empty, State.Init)

	def apply(opts: CsvOptions) = new CsvParser(opts)
	def default = new CsvParser(CsvOptions.default)
	def tsv = new CsvParser(CsvOptions.tsv)
}

class CsvParser(opts: CsvOptions) {
	import opts._
	import CsvParser._
	import State._

	def parseLine(acc: Accumulator, line: String): Accumulator = {

		var state: State = acc.lastState
		val cells = ArrayBuffer.empty[StringBuilder]
		val errors = new ArrayBuffer[String](1)

		var i = 0
		while(i < line.length - 1){
			state = nextState(state, cells, errors, line.charAt(i), line.charAt(i + 1))
			i += 1
		}
		state = nextState(state, cells, errors, line.charAt(i), 0)
		state = nextState(state, cells, errors, 0, 0)

		if(state == Error) throw new CsvParsingException(errors.headOption.getOrElse("Unexpected error"))

		val newCells = cells.map(_.toString).toArray
		val finalCells: Array[String] =
			if(acc.lastState == Init || acc.cells.isEmpty) newCells
			else if(cells.isEmpty) acc.cells
			else {
				val multilineCell: String = acc.cells.last + '\n' + newCells.head
				(acc.cells.init :+ multilineCell) ++ newCells.tail
			}

		new Accumulator(finalCells, state)
	}

	private def nextState(
		state: State,
		cells: ArrayBuffer[StringBuilder],
		errors: ArrayBuffer[String],
		char: Char,
		peekAhead: Char
	): State = if(state == Error) Error else char match {
		case `sep` => state match {
			case Init | Sep => cells.append(newCell); Sep
			case Text => Sep
			case Esc => errors.append("Escaping the separator character is an error"); Error
			case Quote => cells.last.append(sep); Quote
		}
		case `quote` => state match {
			case Init => cells.append(newCell); Quote
			case Text => errors.append("Cannot start quoting in the middle of unquoted cell"); Error
			case Esc => cells.last.append(quote); Quote
			case Quote => if(quote == escape && peekAhead == quote) Esc else Text
			case Sep => cells.append(newCell); Quote
		}
		case `escape` => state match { //escape symbol is different from quoting symbol
			case Init | Text | Sep => errors.append("Escaping is only allowed inside quoted cells"); Error
			case Esc => cells.last.append(escape); Quote //self-escaping of the escape symbol
			case Quote => Esc
		}
		case 0 => state match { //line ended
			case Init | Text => Init //entry done, 0 or more cells parced
			case Esc => errors.append("Unexpected end of line while in escape mode"); Error
			case Quote => Quote //line ended while quoting => multi-line entry
			case Sep => Init //entry done, last cell empty
		}
		case c => state match {
			case Init | Sep => cells.append(new StringBuilder(c.toString)); Text
			case Text => cells.last.append(c); Text
			case Esc => errors.append("Escaping can only be applied to escape and quote symbols"); Error
			case Quote => cells.last.append(c); Quote
		}
	}

	private def newCell = new StringBuilder()
}
