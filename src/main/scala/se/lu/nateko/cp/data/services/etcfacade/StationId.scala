package se.lu.nateko.cp.data.services.etcfacade

import java.util.regex.Pattern

class StationId private (val id: String)

object StationId{

	private val pattern = Pattern.compile("[A-Z]{2}\\-[A-Z][A-Za-z0-9]{2}")

	def unapply(s: String): Option[StationId] =
		if(pattern.matcher(s).matches) Some(new StationId(s))
		else None

	def unapply(id: StationId): Option[String] = Some(id.id)
}
