package se.lu.nateko.cp.data.api

sealed trait B2SafeItem{
	def name: String
	def path: String
}

case class IrodsColl(name: String, parent: Option[IrodsColl] = Some(B2SafeItem.Root)) extends B2SafeItem{
	def path = parent.fold("")(_.path + "/") + name
}

case class IrodsData(name: String, parent: IrodsColl) extends B2SafeItem{
	def path = s"${parent.path}/$name"
}

object B2SafeItem{
	val Root = IrodsColl("", None)
}
