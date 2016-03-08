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
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum
import se.lu.nateko.cp.meta.core.data.DataObject
import se.lu.nateko.cp.meta.core.data.WdcggUploadCompletion
import se.lu.nateko.cp.meta.core.sparql.BoundLiteral
import se.lu.nateko.cp.meta.core.sparql.BoundUri

class IngestionUploadTask(dataObj: DataObject, originalFile: File, sparql: SparqlClient) extends UploadTask{

	import sparql.materializer.executionContext

	private val file = new File(originalFile, ".cpb")

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = dataObj.specification.format

		if(format.uri == CpMetaVocab.asciiWdcggTimeSer){
			import se.lu.nateko.cp.data.formats.wdcgg.TimeSeriesStreams._

			val columnFormats = getColumnFormats(dataObj.hash)

			val nRowsSink = wdcggParser.toMat(Sink.head)(Keep.right)

			val completionInfoSink = Flow.apply[String]
				.alsoToMat(wdcggHeaderSink)(Keep.right)
				.toMat(nRowsSink){(kvFut, rowFut) =>
					for(kv <- kvFut; row <- rowFut) yield
						IngestionSuccess(WdcggUploadCompletion(row.nRows, kv))
				}

			val toBinTableSink = wdcggParser
				.via(wdcggToBinTableConverter(columnFormats))
				.to(BinTableSink(file))

			linesFromBinary
				.alsoTo(toBinTableSink)
				.toMat(completionInfoSink)(Keep.right)

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
				val valFormat = binding.get("colName").collect{
					case BoundUri(format) => ValueFormat.fromUri(format)
				}
				colName.zip(valFormat)
			}.flatten.toMap
		}
	}
}
