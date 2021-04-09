package se.lu.nateko.cp.data.services.fetch

import akka.NotUsed
import akka.stream.scaladsl.Source
import se.lu.nateko.cp.data.api.MetaClient.asLiteral
import se.lu.nateko.cp.data.api.MetaClient.asLiteralOpt
import se.lu.nateko.cp.data.api.MetaClient.asResource
import se.lu.nateko.cp.data.api.SparqlClient
import se.lu.nateko.cp.data.formats.TimeSeriesToBinTableConverter
import se.lu.nateko.cp.data.formats.bintable
import se.lu.nateko.cp.data.formats.bintable.BinTableRowReader
import se.lu.nateko.cp.data.services.upload.IngestionUploadTask
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.Envri.Envri
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs
import se.lu.nateko.cp.meta.core.data.staticObjLandingPage
import se.lu.nateko.cp.meta.core.sparql.BoundUri

import java.io.File
import java.net.URI
import scala.concurrent.Future

class BinTableCsvReader(upload: UploadService)(implicit envriConf: EnvriConfigs) {

	import upload.meta.{sparql, dispatcher}

	def csvSource(
		hash: Sha256Sum,
		onlyColumnNames: Option[Array[String]],
		offsetOpt: Option[Long],
		limitOpt: Option[Int]
	)(implicit envri: Envri): Future[Source[String, NotUsed]] = {

		val dobj = staticObjLandingPage(hash)(envriConf(envri))

		sparql.select(specAndColsQuery(dobj)).flatMap{res =>

			val binding = res.results.bindings.headOption.getOrElse{
				throw new Exception(s"Data object not found: $dobj")
			}
			val spec = asResource(binding, "spec")
			val objFormat = asResource(binding, "objFormat")
			val nRows = asLiteral(binding, "nRows").toInt

			val actualColNames = asLiteralOpt(binding, "colNames").map{arrStr =>
				import spray.json._
				import DefaultJsonProtocol._
				arrStr.parseJson.convertTo[Seq[String]]
			}

			val offset = offsetOpt.getOrElse(0L)
			if(offset >= nRows) Future.successful(Source.empty) else {
				val limit = Math.min(limitOpt.getOrElse(Int.MaxValue), nRows - offset.toInt)

				IngestionUploadTask.getColumnFormats(spec, sparql).map{colsMeta =>
					val readSchema = TimeSeriesToBinTableConverter.getReadingSchema(onlyColumnNames, actualColNames, nRows, colsMeta)
					val origFile = upload.getFile(Some(objFormat), hash)
					val file = new File(origFile.getAbsolutePath + bintable.FileExtension)

					val valueRows = new BinTableRowReader(file, readSchema.binSchema)
						.rows(readSchema.fetchIndices, offset, limit)
						.map{row =>
							row.indices.map{i =>
								readSchema.serializers(i)(row(i))
							}.mkString("", ",", "\n")
						}
						.mapMaterializedValue(_ => NotUsed)
					Source.single(readSchema.fetchedColumns.mkString("", ",", "\n")).concat(valueRows)
				}
			}
		}
	}

	private def specAndColsQuery(dobj: URI): String = {
		s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
			|select * where {
			|	bind (<$dobj> as ?dobj)
			|	?dobj cpmeta:hasObjectSpec ?spec .
			|	?spec cpmeta:hasFormat ?objFormat .
			|	?dobj cpmeta:hasNumberOfRows ?nRows .
			|	optional{?dobj cpmeta:hasActualColumnNames ?colNames }
			|}""".stripMargin
	}
}
