package se.lu.nateko.cp.data.services.dlstats

import java.{util => ju}

object DlItemType extends Enumeration{

	val Data = Value("data")
	val Collection = Value("collection")
	val Document = Value("document")

	def parse(name: String): Option[Value] = try{
		Some(withName(name))
	} catch{
		case _: ju.NoSuchElementException => None
	}
}
