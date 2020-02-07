package se.lu.nateko.cp.data.api

sealed trait B2StageItem{
	def name: String
	def path: String
}

case class IrodsColl(name: String, parent: Option[IrodsColl] = Some(B2StageItem.Root)) extends B2StageItem{
	def path = parent.fold("")(_.path + "/") + name
}

case class IrodsData(name: String, parent: IrodsColl) extends B2StageItem{
	def path = s"${parent.path}/$name"
}

object B2StageItem{
	val Root = IrodsColl("", None)
}
