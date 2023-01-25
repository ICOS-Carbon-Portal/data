package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport
import akka.http.scaladsl.marshalling.ToEntityMarshaller
import spray.json.BasicFormats
import spray.json.JsArray
import spray.json.JsValue
import spray.json.JsonWriter
import spray.json.RootJsonWriter

trait SprayRouting extends BasicFormats:
	given [T: JsonWriter]: RootJsonWriter[IndexedSeq[T]] with
		def write(seq: IndexedSeq[T]): JsValue =
			val writer = summon[JsonWriter[T]]
			JsArray(seq.iterator.map(writer.write).toVector)

	given [T: RootJsonWriter]: ToEntityMarshaller[T] = SprayJsonSupport.sprayJsonMarshaller
	given ToEntityMarshaller[JsValue] = SprayJsonSupport.sprayJsValueMarshaller
