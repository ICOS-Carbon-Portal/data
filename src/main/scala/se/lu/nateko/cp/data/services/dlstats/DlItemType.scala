package se.lu.nateko.cp.data.services.dlstats

enum DlItemType:
	case data, collection, document

object DlItemType:
	def parse(name: String): Option[DlItemType] =
		try Some(DlItemType.valueOf(name))
		catch case _: IllegalArgumentException => None
