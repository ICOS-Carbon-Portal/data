package se.lu.nateko.cp.data.services.upload

import java.io.File

import scala.concurrent.Future

import akka.Done
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import se.lu.nateko.cp.data.api.CpMetaVocab
import se.lu.nateko.cp.data.api.SparqlClient
import se.lu.nateko.cp.data.formats.ValueFormat
import se.lu.nateko.cp.data.formats.bintable.BinTableSink
import se.lu.nateko.cp.data.formats.bintable.FileExtension
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.WdcggUploadCompletion
import se.lu.nateko.cp.meta.core.sparql.BoundLiteral
import se.lu.nateko.cp.meta.core.sparql.BoundUri

class IngestionUploadTask(dataObj: DataObject, originalFile: File, sparql: SparqlClient) extends UploadTask{

	import sparql.materializer.executionContext

	private val file = new File(originalFile.getAbsolutePath + FileExtension)

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = dataObj.specification.format

		if(format.uri == CpMetaVocab.asciiWdcggTimeSer){

			import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesStreams._

			val columnFormats = getColumnFormats(dataObj.hash)
			val rowParser = wdcggParser

			val firstRowSink = rowParser.toMat(Sink.head)(Keep.right)

			val taskResultSink = Flow.apply[String]
				.alsoToMat(wdcggHeaderSink)(Keep.right)
				.toMat(firstRowSink){(kvFut, rowFut) =>
					for(kv <- kvFut; row <- rowFut) yield {
						val complInfo = WdcggUploadCompletion(row.header.nRows, kv)
						IngestionSuccess(complInfo)
					}
				}

			val toBinTableSink: Sink[String, Future[Long]] = rowParser
				.via(wdcggToBinTableConverter(columnFormats))
				.toMat(BinTableSink(file))(Keep.right)

			linesFromBinary
				.alsoToMat(toBinTableSink)(Keep.right)
				.toMat(taskResultSink){(bytesFut, successFut) =>
					val resultFut = for(_ <- bytesFut; success <- successFut) yield success
					resultFut.recover{
						case exc: Throwable => IngestionFailure(exc)
					}
				}

		} else Sink.cancelled.mapMaterializedValue(_ =>
			Future.successful(
				NotImplementedFailure(s"Ingestion of format ${format.label} is not supported")
			)
		)
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) =
		UploadTask.revertOnAnyFailure(ownResult, otherTaskResults, () => Future{
			if(file.exists) file.delete()
			Done
		})

	def getColumnFormats(dataObjHash: Sha256Sum): Future[Map[String, ValueFormat]] = {
		val dataObjUri = CpMetaVocab.getDataObject(dataObjHash)

		val query = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		|select ?colName ?valFormat where{
		|	<$dataObjUri> cpmeta:hasObjectSpec ?spec .
		|	?spec cpmeta:containsDataset ?dataSet .
		|	?dataSet cpmeta:hasColumn ?column .
		|	?column cpmeta:hasColumnTitle ?colName .
		|	?column cpmeta:hasValueFormat ?valFormat .
		|}""".stripMargin

		sparql.select(query).map{ssr =>
			ssr.results.bindings.map{binding =>
				val colName = binding.get("colName").collect{case BoundLiteral(col, _) => col}
				val valFormat = binding.get("valFormat").collect{
					case BoundUri(format) => ValueFormat.fromUri(format)
				}
				colName.zip(valFormat)
			}.flatten.toMap
		}
	}
}
