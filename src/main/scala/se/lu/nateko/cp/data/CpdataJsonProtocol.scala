package se.lu.nateko.cp.data

import se.lu.nateko.cp.cpauth.core.UserId
import se.lu.nateko.cp.data.formats.bintable.BinTableSlice
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.Schema
import se.lu.nateko.cp.data.services.fetch.BinTableRequest
import se.lu.nateko.cp.meta.core.CommonJsonSupport
import se.lu.nateko.cp.meta.core.crypto.JsonSupport.given
import spray.json.*
import DefaultJsonProtocol.*

object CpdataJsonProtocol extends CommonJsonSupport {

	given RootJsonFormat[BinTableSlice] = jsonFormat2(BinTableSlice.apply)

	given RootJsonFormat[UserId] = jsonFormat1(UserId.apply)


	given JsonFormat[DataType] with{
		override def write(dt: DataType) = JsString(dt.toString())

		override def read(value: JsValue) = value match{
			case JsString(dtName) =>
				try{
					DataType.valueOf(dtName)
				}catch{
					case _: IllegalArgumentException =>
						deserializationError(s"Unknown DataType '$dtName'")
				}
			case _ => deserializationError("Expected a string")
		}
	}

	given RootJsonFormat[Schema] with{
		override def write(schema: Schema) = JsObject(
			"columns" -> schema.columns.toJson,
			"size" -> JsNumber(schema.size)
		)

		override def read(value: JsValue) =
			value.asJsObject.getFields("columns", "size") match {
				case Seq(dtypes, JsNumber(size)) => new Schema(
					dtypes.convertTo[Array[DataType]],
					size.toLong
				)
				case _ => deserializationError("Expected a BinTable scheme with 'columns' and 'size'-number")
			}
	}

	given RootJsonFormat[BinTableRequest] = jsonFormat5(BinTableRequest.apply)
}
