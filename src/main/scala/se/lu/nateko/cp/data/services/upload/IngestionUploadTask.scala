package se.lu.nateko.cp.data.services.upload

import java.nio.file.{Path, Files}

import akka.{Done, NotUsed}
import akka.stream.scaladsl.{Flow, Keep, Sink}
import akka.util.ByteString
import se.lu.nateko.cp.data.api.{CpDataException, SparqlClient}
import se.lu.nateko.cp.data.api.CpMetaVocab.ObjectFormats.*
import se.lu.nateko.cp.data.api.SitesMetaVocab.*
import se.lu.nateko.cp.data.formats.*
import se.lu.nateko.cp.data.formats.bintable.{BinTableSink, FileExtension}
import se.lu.nateko.cp.data.streams.{KeepFuture, ZipEntryFlow, ZipValidator}
import se.lu.nateko.cp.meta.core.data.*
import se.lu.nateko.cp.meta.core.sparql.{BoundLiteral, BoundUri}

import scala.concurrent.{ExecutionContext, Future}
import se.lu.nateko.cp.data.api.MetaClient
import se.lu.nateko.cp.meta.core.etcupload.StationId
import java.net.URI
import se.lu.nateko.cp.data.utils.io.withSuffix

class IngestionUploadTask(
	ingSpec: IngestionSpec,
	originalFile: Path,
	colsMeta: ColumnsMeta
)(using ExecutionContext) extends UploadTask{
	import IngestionUploadTask.{RowParser, IngestionSink}

	val file = originalFile.withSuffix(FileExtension)
	private val binTableConverter = new TimeSeriesToBinTableConverter(colsMeta)
	private val defaultColumnFormats = ColumnsMetaWithTsCol(colsMeta, "TIMESTAMP")

	def sink: Sink[ByteString, Future[UploadTaskResult]] = {
		val format = ingSpec.objSpec.format.self

		val ingestionSink = format.uri match {

			case `asciiAtcProdTimeSer` =>
				makeIngestionSink(atcprod.AtcProdStreams.atcProdParser(defaultColumnFormats, ingSpec.nRows))

			case `asciiAtcFlaskTimeSer` =>
				makeIngestionSink(atcprod.AtcProdStreams.flaskParser(colsMeta, ingSpec.nRows))

			case `asciiEtcTimeSer` =>
				defaultStandardSink(ecocsv.EcoCsvStreams.ecoCsvParser)

			case `asciiOtcSocatTimeSer` =>
				defaultStandardSink(otc.OtcCsvStreams.socatTsvParser)

			case `asciiOtcProductCsv` =>
				defaultStandardSink(otc.OtcCsvStreams.otcProductParser)

			case `csvWithIso8601tsFirstCol` =>
				standardSink(new StandardCsvWithTimestampFirstCol(colsMeta).getParser)

			case `sitesDelimitedHeaderCsvTimeSer` =>
				standardSink{nRows =>
					val colFormats = ColumnsMetaWithTsCol(colsMeta, "TEMP_UTC_TIMESTAMP_FOR_EXTRACTING_DATES")
					new delimitedheadercsv.SitesDelimitedHeaderCsvStreams(colsMeta).standardCsvParser(nRows, colFormats)
				}

			case `asciiEtcHalfHourlyProdTimeSer` => ingSpec.timeZoneOffset.fold(
				failedSink(IncompleteMetadataFailure(ingSpec.label, "No time zone offset found for object's station"))
			): utcOffset =>
				defaultStandardSink(new etcprod.EtcHalfHourlyProductStreams(utcOffset).standardCsvParser)

			case _ =>
				failedSink(NotImplementedFailure(s"Ingestion of format '${format.label.getOrElse(format.uri)}' is not supported"))
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
		val tmpFile = file.withSuffix(".working")
		lineParser
			.viaMat(rowParser)(Keep.right)
			.map(binTableConverter.parseRow)
			.toMat(BinTableSink(tmpFile.toFile, overwrite = true))(KeepFuture.left)
			.mapMaterializedValue(
				_.map{ingMeta =>
					import java.nio.file.StandardCopyOption.*
					Files.move(tmpFile, file, ATOMIC_MOVE, REPLACE_EXISTING)
					IngestionSuccess(ingMeta)
				}.recover{
					case exc: Throwable =>
						Files.deleteIfExists(tmpFile)
						IngestionFailure(exc)
				}
			)
	}

	private def makeEncodingSpecificFlow(encoding: UriResource): ZipEntryFlow.Unzipper = {
		import se.lu.nateko.cp.data.api.CpMetaVocab.{plainFile, zipEncoding}
		encoding.uri match{
			case `plainFile` => 
				Flow.apply[ByteString]
			case `zipEncoding` =>
				ZipValidator.unzipIfValidOrBypass(ZipEntryFlow.singleEntryUnzip)

			case encUri => throw new CpDataException("Unsupported encoding " + encoding.label.getOrElse(encUri.toString))
		}
	}

	def onComplete(ownResult: UploadTaskResult, otherTaskResults: Seq[UploadTaskResult]) = {
		val relevantOtherErrors = otherTaskResults.collect{
			case failure: HashsumCheckFailure => failure
			case failure: UnexpectedTaskFailure => failure
		}

		UploadTask.revertOnAnyFailure(ownResult, relevantOtherErrors, () => Future{
			Files.deleteIfExists(file)
			Done
		})
	}
}

class IngestionSpec(
	val objSpec: DataObjectSpec,
	val nRows: Option[Int],
	val label: Option[String],
	val timeZoneOffset: Option[Int]
)

object IngestionSpec{
	def apply(dobj: DataObject): IngestionSpec = new IngestionSpec(
		dobj.specification,
		dobj.specificInfo.toOption.flatMap(_.nRows),
		Some(dobj.hash.id),
		dobj.specificInfo.toOption.flatMap(_.acquisition.station.timeZoneOffset)
	)
}

object IngestionUploadTask{

	type RowParser = Flow[String, TableRow, Future[IngestionMetadataExtract]]
	type IngestionSink = Sink[ByteString, Future[UploadTaskResult]]

	def apply(ingSpec: IngestionSpec, originalFile: Path, meta: MetaClient): Future[IngestionUploadTask] = {
		import meta.dispatcher

		val formatsFut = getColumnFormats(ingSpec.objSpec.self.uri, meta.sparql)

		for(formats <- formatsFut) yield
			new IngestionUploadTask(ingSpec, originalFile, formats)
	}

	def getColumnFormats(objSpec: URI, sparql: SparqlClient)(implicit ctxt: ExecutionContext): Future[ColumnsMeta] = {

		val query = s"""prefix cpmeta: <http://meta.icos-cp.eu/ontologies/cpmeta/>
		|select ?colName ?valFormat ?isRegex ?isOptional where{
		|	<$objSpec> cpmeta:containsDataset ?dataSet .
		|	?dataSet cpmeta:hasColumn ?column .
		|	?column cpmeta:hasColumnTitle ?colName .
		|	?column cpmeta:hasValueFormat ?valFormat .
		|	OPTIONAL{?column cpmeta:isRegexColumn ?isRegex}
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
