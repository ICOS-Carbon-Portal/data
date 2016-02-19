package se.lu.nateko.cp.data

import spray.json._
import se.lu.nateko.cp.data.formats.netcdf.RasterMessage
import se.lu.nateko.cp.data.formats.netcdf.BoundingBox
import se.lu.nateko.cp.data.formats.netcdf.Stats
import se.lu.nateko.cp.data.formats.bintable.DataType
import se.lu.nateko.cp.data.formats.bintable.Schema

object CpdataJsonProtocol extends DefaultJsonProtocol {

	implicit val statsFormat = jsonFormat2(Stats)
	implicit val boundingBoxFormat = jsonFormat4(BoundingBox)
	implicit val rasterFormat = jsonFormat3(RasterMessage)

	implicit object binTableDataTypeFormat extends JsonFormat[DataType]{
		override def write(dt: DataType) = JsString(dt.name())

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

	implicit object binTableSchemaFormat extends RootJsonFormat[Schema]{
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
}
