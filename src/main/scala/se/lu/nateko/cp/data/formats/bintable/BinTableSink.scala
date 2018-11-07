package se.lu.nateko.cp.data.formats.bintable

import java.io.EOFException
import java.io.File
import java.nio.file.FileAlreadyExistsException

import scala.concurrent.Future
import scala.concurrent.Promise

import akka.stream.ActorAttributes
import akka.stream.Attributes
import akka.stream.Inlet
import akka.stream.SinkShape
import akka.stream.scaladsl.Sink
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.GraphStageWithMaterializedValue
import akka.stream.stage.InHandler

class BinTableRow(val cells: Array[AnyRef], val schema: Schema)

object BinTableSink {

	def apply(file: File, overwrite: Boolean = false): Sink[BinTableRow, Future[Long]] =
		Sink.fromGraph(new BinTableSink(file, overwrite))
			.withAttributes(Attributes(ActorAttributes.IODispatcher))

}

private class BinTableSink(file: File, overwrite: Boolean) extends GraphStageWithMaterializedValue[SinkShape[BinTableRow], Future[Long]]{

	private val in: Inlet[BinTableRow] = Inlet("BinTableRowInput")

	override val shape = SinkShape(in)

	override def createLogicAndMaterializedValue(inheritedAttributes: Attributes): (GraphStageLogic, Future[Long]) = {

		val countPromise = Promise[Long]()

		val logic = new GraphStageLogic(shape){

			private[this] var writer: BinTableWriter = null
			private[this] var writerClosed = false
			private[this] var count: Long = 0
			private[this] var schema: Schema = null

			override def preStart(): Unit =
				if(file.exists && !overwrite)
					failBinTable(
						new FileAlreadyExistsException("File already exists: " + file.getName)
					)
				else pull(in)
	
			setHandler(in, new InHandler{

				override def onPush(): Unit = {
					val nextRow = grab(in)
					if(count < nextRow.schema.size){
						pull(in)
						writeRow(nextRow)
					}else failBinTable(
						new IndexOutOfBoundsException(s"Have already written $count rows, can not accept more")
					)
				}

				override def onUpstreamFinish(): Unit = {
					if(isAvailable(in)) writeRow(grab(in))

					closeWriter()

					if(schema == null || count == schema.size)
						countPromise.success(count)
					else failBinTable(
						new EOFException(s"Got $count rows while expected ${schema.size}")
					)
				}

				override def onUpstreamFailure(ex: Throwable): Unit = failBinTable(ex)
			})

			private def writeRow(row: BinTableRow): Unit =
				try{
					if(writer == null){
						schema = row.schema
						writer = new BinTableWriter(file, schema)
					}
					writer.writeRow(row.cells)
					count += 1
				}catch{
					case err: Throwable => failBinTable(
						new Exception(s"Failed to write row #$count to $file . ${err.getClass.getName}: ${err.getMessage}", err)
					)
				}

			private def failBinTable(exc: Throwable): Unit = {
				failStage(exc)
				closeWriter()
				countPromise.failure(exc)
			}

			private def closeWriter(): Unit = if(writer != null && !writerClosed){
				writer.close()
				writerClosed = true
			}

		}
		(logic, countPromise.future)
	}

}
