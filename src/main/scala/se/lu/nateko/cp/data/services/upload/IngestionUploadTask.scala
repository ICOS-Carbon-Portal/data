package se.lu.nateko.cp.data.services.upload

import java.io.File
import java.nio.file.Files

import akka.{Done, NotUsed}
import akka.stream.scaladsl.{Flow, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.data.api.{CpDataException, SparqlClient}
import se.lu.nateko.cp.data.api.CpMetaVocab.ObjectFormats._
import se.lu.nateko.cp.data.api.SitesMetaVocab._
import se.lu.nateko.cp.data.formats._
import se.lu.nateko.cp.data.formats.bintable.{BinTableSink, FileExtension}
import se.lu.nateko.cp.data.streams.{KeepFuture, ZipEntryFlow}
import se.lu.nateko.cp.meta.core.data._
import se.lu.nateko.cp.meta.core.sparql.{BoundLiteral, BoundUri}

import scala.concurrent.{ExecutionContext, Future}
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.meta.core.etcupload.StationId

class IngestionUploadTask(
	ingSpec: IngestionSpec,
	originalFile: File,
	colsMeta: ColumnsMeta,
	utcOffset: Int
)(implicit ctxt: ExecutionContext) extends UploadTask{
	import IngestionUploadTask.{RowParser, IngestionSink}

	//TODO Switch to java.nio classes
	val file = new File(originalFile.getAbsolutePath + FileExtension)
	private val tmpFile = new File(file.getAbsoluteFile + ".working")
	private val binTableConverter = new TimeSeriesToBinTableConverter(colsMeta)
	private val defaultColumnFormats = ColumnsMetaWithTsCol(colsMeta, "TIMESTAMP")

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = ingSpec.objSpec.format

		val ingestionSink = format.uri match {

			case `asciiWdcggTimeSer` =>
				import wdcgg.WdcggStreams.{wdcggParser, linesFromBinary}
				makeIngestionSink(wdcggParser(defaultColumnFormats), linesFromBinary)

			case `asciiAtcProdTimeSer` =>
				makeIngestionSink(atcprod.AtcProdStreams.atcProdParser(defaultColumnFormats))

			case `asciiEtcTimeSer` =>
				defaultStandardSink(ecocsv.EcoCsvStreams.ecoCsvParser)
			
			case `asciiOtcSocatTimeSer` =>
				defaultStandardSink(otc.OtcCsvStreams.socatTsvParser)
			
			case `asciiOtcProductCsv` =>
				defaultStandardSink(otc.OtcCsvStreams.otcProductParser)
			
			case `simpleSitesCsvTimeSer` =>
				standardSink{nRows =>
					val colFormats = ColumnsMetaWithTsCol(colsMeta, "UTC_TIMESTAMP")
					simplesitescsv.SimpleSitesCsvStreams.standardCsvParser(nRows, colFormats)
				}

			case `dailySitesCsvTimeSer` =>
				defaultStandardSink(dailysitescsv.DailySitesCsvStreams.standardCsvParser)

			case `sitesDelimitedHeaderCsvTimeSer` =>
				standardSink{nRows =>
					delimitedheadercsv.SitesDelimitedHeaderCsvStreams.standardCsvParser(nRows, defaultColumnFormats)
				}

			case `asciiEtcHalfHourlyProdTimeSer` =>
				defaultStandardSink(new etcprod.EtcHalfHourlyProductStreams(utcOffset).standardCsvParser)

			case _ =>
				failedSink(NotImplementedFailure(s"Ingestion of format ${format.label} is not supported"))
		}

		val decoderFlow = makeEncodingSpecificFlow(ingSpec.objSpec.encoding)
		decoderFlow.toMat(ingestionSink)(Keep.right)
	}

	private def failedSink[T](result: UploadTaskResult) = Sink.cancelled[T].mapMaterializedValue(_ => Future.successful(result))

	private def defaultStandardSink(parserFactory: (Int, ColumnsMetaWithTsCol) => RowParser) =
		standardSink(parserFactory(_, defaultColumnFormats))

	private def standardSink(parserFactory: Int => RowParser): IngestionSink =
		ingSpec.nRows.fold[IngestionSink](
			failedSink(IncompleteMetadataFailure(ingSpec.label, "Missing nRows (number of rows)"))
		){
			nRows => makeIngestionSink(parserFactory(nRows))
		}

	private def makeIngestionSink(
		rowParser: RowParser,
		lineParser: Flow[ByteString, String, NotUsed] = TimeSeriesStreams.linesFromUtf8Binary,
	): IngestionSink = {

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

class IngestionSpec(
	val objSpec: DataObjectSpec,
	val nRows: Option[Int],
	val label: Option[String],
	val stationId: Option[String]
)

object IngestionSpec{
	def apply(dobj: DataObject): IngestionSpec = new IngestionSpec(
		dobj.specification,
		dobj.specificInfo.right.toOption.flatMap(_.nRows),
		Some(dobj.hash.id),
		dobj.specificInfo.right.toOption.map(_.acquisition.station.id)
	)
}

object IngestionUploadTask{

	type RowParser = Flow[String, TableRow, Future[IngestionMetadataExtract]]
	type IngestionSink = Sink[ByteString, Future[UploadTaskResult]]

	def apply(ingSpec: IngestionSpec, originalFile: File, meta: MetaClient): Future[IngestionUploadTask] = {
		import meta.materializer.executionContext

		val formatsFut = getColumnFormats(ingSpec.objSpec, meta.sparql)

		val utcOffsetFut: Future[Int] = ingSpec.stationId.collect{
			case StationId(stationId) if(ingSpec.objSpec.format.uri == asciiEtcHalfHourlyProdTimeSer) =>
				meta.getUtcOffset(stationId)
		}.getOrElse(Future.successful(0))

		for(utcOffset <- utcOffsetFut; formats <- formatsFut) yield
			new IngestionUploadTask(ingSpec, originalFile, formats, utcOffset)
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
