package se.lu.nateko.cp.data.services.upload

import java.io.File
import java.nio.file.Files

import akka.{Done, NotUsed}
import akka.stream.scaladsl.{Flow, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.data.api.{CpDataException, SparqlClient}
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.{BinTableSink, FileExtension}
import se.lu.nateko.cp.data.streams.{KeepFuture, ZipEntryFlow}
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.sparql.{BoundLiteral, BoundUri}

import scala.concurrent.{ExecutionContext, Future}

class IngestionUploadTask(
	ingSpec: IngestionSpec,
	originalFile: File,
	colsMeta: ColumnsMeta
)(implicit ctxt: ExecutionContext) extends UploadTask{

	//TODO Switch to java.nio classes
	val file = new File(originalFile.getAbsolutePath + FileExtension)
	private val tmpFile = new File(file.getAbsoluteFile + ".working")
	private val binTableConverter = new TimeSeriesToBinTableConverter(colsMeta)

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = ingSpec.objSpec.format

		import se.lu.nateko.cp.data.api.CpMetaVocab.{asciiAtcProdTimeSer, asciiEtcTimeSer, asciiOtcSocatTimeSer, asciiWdcggTimeSer}
		import se.lu.nateko.cp.data.api.SitesMetaVocab.{dailySitesCsvTimeSer, simpleSitesCsvTimeSer}

		val defaultColumnFormats = ColumnsMetaWithTsCol(colsMeta, "TIMESTAMP")

		val ingestionSink = format.uri match {

			case `asciiWdcggTimeSer` =>
				import wdcgg.WdcggStreams.{wdcggParser, linesFromBinary}
				makeIngestionSink(wdcggParser(defaultColumnFormats), linesFromBinary)

			case `asciiAtcProdTimeSer` =>
				makeIngestionSink(atcprod.AtcProdStreams.atcProdParser(defaultColumnFormats))

			case `asciiEtcTimeSer` | `asciiOtcSocatTimeSer` | `simpleSitesCsvTimeSer` | `dailySitesCsvTimeSer` =>

				ingSpec.nRows match{

					case None =>
						failedSink(IncompleteMetadataFailure(ingSpec.label, "Missing nRows (number of rows)"))

					case Some(nRows) =>
						val rowParser =
							if (format.uri == asciiEtcTimeSer)
								ecocsv.EcoCsvStreams.ecoCsvParser(nRows, defaultColumnFormats)
							else if (format.uri == asciiOtcSocatTimeSer)
								socat.SocatTsvStreams.socatTsvParser(nRows, defaultColumnFormats)
							else if (format.uri == simpleSitesCsvTimeSer){
								val colFormats = ColumnsMetaWithTsCol(colsMeta, "UTC_TIMESTAMP")
								simplesitescsv.SimpleSitesCsvStreams.simpleCsvParser(nRows, colFormats)
							} else
								dailysitescsv.DailySitesCsvStreams.simpleCsvParser(nRows, defaultColumnFormats)

						makeIngestionSink(rowParser)
				}

			case _ =>
				failedSink(NotImplementedFailure(s"Ingestion of format ${format.label} is not supported"))
		}

		val decoderFlow = makeEncodingSpecificFlow(ingSpec.objSpec.encoding)
		decoderFlow.toMat(ingestionSink)(Keep.right)
	}

	private def failedSink[T](result: UploadTaskResult) = Sink.cancelled[T].mapMaterializedValue(_ => Future.successful(result))

	private def makeIngestionSink(
		rowParser: Flow[String, TableRow, Future[IngestionMetadataExtract]],
		lineParser: Flow[ByteString, String, NotUsed] = TimeSeriesStreams.linesFromUtf8Binary,
	): Sink[ByteString, Future[UploadTaskResult]] = {

		lineParser
			.viaMat(rowParser)(Keep.right)
			.map(binTableConverter.parseRow)
			.toMat(BinTableSink(tmpFile, overwrite = true))(KeepFuture.left)
			.mapMaterializedValue(
				_.map{ingMeta =>
					import java.nio.file.StandardCopyOption._
					Files.move(tmpFile.toPath, file.toPath, ATOMIC_MOVE, REPLACE_EXISTING)
					IngestionSuccess(ingMeta)
				}.recover{
					case exc: Throwable =>
						Files.deleteIfExists(tmpFile.toPath)
						IngestionFailure(exc)
				}
			)
	}

	private def makeEncodingSpecificFlow(encoding: UriResource): Flow[ByteString, ByteString, NotUsed] = {
		import se.lu.nateko.cp.data.api.CpMetaVocab.{plainFile, zipEncoding}
		encoding.uri match{
			case `plainFile` => Flow.apply[ByteString]
			case `zipEncoding` => ZipEntryFlow.singleEntryUnzip
			case encUri => throw new CpDataException("Unsupported encoding " + encoding.label.getOrElse(encUri.toString))
		}
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = {
		val relevantOtherErrors = otherTaskResults.collect{
			case failure: HashsumCheckFailure => failure
			case failure: UnexpectedTaskFailure => failure
		}

		UploadTask.revertOnAnyFailure(ownResult, relevantOtherErrors, () => Future{
			if(file.exists) file.delete()
			Done
		})
	}
}

case class IngestionSpec(objSpec: DataObjectSpec, nRows: Option[Int], label: Option[String])

object IngestionSpec{
	import scala.language.implicitConversions
	implicit def fromDataObject(dobj: DataObject) = IngestionSpec(
		dobj.specification,
		dobj.specificInfo.right.toOption.flatMap(_.nRows),
		Some(dobj.hash.id)
	)
}

object IngestionUploadTask{

	def apply(ingSpec: IngestionSpec, originalFile: File, sparql: SparqlClient): Future[IngestionUploadTask] = {
		import sparql.materializer.executionContext
		getColumnFormats(ingSpec.objSpec, sparql).map{formats =>
			new IngestionUploadTask(ingSpec, originalFile, formats)
		}
	}

	def getColumnFormats(spec: DataObjectSpec, sparql: SparqlClient): Future[ColumnsMeta] = {
		import sparql.materializer.executionContext

		val query = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		|select ?colName ?valFormat ?isRegex ?isOptional where{
		|	<${spec.self.uri}> cpmeta:containsDataset ?dataSet .
		|	?dataSet cpmeta:hasColumn ?column .
		|	?column cpmeta:hasColumnTitle ?colName .
		|	?column cpmeta:hasValueFormat ?valFormat .
		| OPTIONAL{?column cpmeta:isRegexColumn ?isRegex}
		|	OPTIONAL{?column cpmeta:isOptionalColumn ?isOptional}
		|}""".stripMargin

		sparql.select(query).map{ssr =>
			val colMetas = ssr.results.bindings.flatMap{binding =>
				val colNameOpt = binding.get("colName").collect{case BoundLiteral(col, _) => col}
				val valFormatOpt = binding.get("valFormat").collect{
					case BoundUri(format) => ValueFormat.fromUri(format)
				}
				def getBoolean(varName: String): Boolean = binding.get(varName).collect{
					case BoundLiteral(bool, _) if bool.toLowerCase == "true" => true
					case _ => false
				}.getOrElse(false)
				val isRegex = getBoolean("isRegex")
				val isOptional = getBoolean("isOptional")

				for(colName <- colNameOpt; valFormat <- valFormatOpt) yield{
					if(isRegex) RegexColumn(valFormat, colName.r, isOptional)
					else PlainColumn(valFormat, colName, isOptional)
				}
			}
			new ColumnsMeta(colMetas)
		}
	}
}

