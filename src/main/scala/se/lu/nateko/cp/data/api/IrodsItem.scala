package se.lu.nateko.cp.data.api

sealed trait IrodsItem:
	def name: String
	def path: String


case class IrodsColl(name: String, parent: Option[IrodsColl] = Some(IrodsItem.Root)) extends IrodsItem:
	def path = parent.fold("")(_.path + "/") + name


case class IrodsData(name: String, parent: IrodsColl) extends IrodsItem:
	def path = s"${parent.path}/$name"


object IrodsItem:
	val Root = IrodsColl("", None)
