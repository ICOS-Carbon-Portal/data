package se.lu.nateko.cp.data.api

import spray.json.DefaultJsonProtocol
import spray.json.RootJsonReader

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

object B2StageItem extends DefaultJsonProtocol{

	val Root = IrodsColl("", None)

	case class ApiResponseItem(dataName: Option[String], collectionName: String)
	type ApiResponse = Array[ApiResponseItem]

	implicit val apiResponseItemFormat = jsonFormat2(ApiResponseItem)
	implicit val apiResponseFormat: RootJsonReader[ApiResponse] = arrayFormat[ApiResponseItem]

	private def toCollection(apiPath: String): IrodsColl = {
		def makeColl(segments: List[String]): IrodsColl = segments match{
			case Nil => Root
			case head :: tail => IrodsColl(head, Some(makeColl(tail)))
		}
		//TODO Get rid of the hard-coded path prefix
		val trimmed = apiPath.stripPrefix("/eudat.fi/home/oleg").stripPrefix("/")
		makeColl(trimmed.split("/").reverse.filterNot(_.isEmpty).toList)
	}

	def toB2StageItem(item: ApiResponseItem): B2StageItem = {
		val coll = toCollection(item.collectionName)
		item.dataName.fold[B2StageItem](coll)(IrodsData(_, coll))
	}
}
