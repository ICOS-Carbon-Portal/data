package se.lu.nateko.cp.data.streams

import java.io.File

import akka.stream.Attributes
import akka.stream.Inlet
import akka.stream.SinkShape
import akka.stream.scaladsl.Sink
import akka.stream.stage.GraphStage
import akka.stream.stage.GraphStageLogic
import akka.stream.stage.InHandler
import se.lu.nateko.cp.data.formats.bintable.BinTableWriter
import se.lu.nateko.cp.data.formats.bintable.Schema

object BinTableSink {

	def apply(file: File, schema: Schema): Sink[Array[Object], Unit] = Sink.fromGraph(new BinTableSink(file, schema))

}

private class BinTableSink(file: File, schema: Schema) extends GraphStage[SinkShape[Array[Object]]]{

	private val in: Inlet[Array[Object]] = Inlet("BinTableRowInput")

	override val shape = SinkShape(in)

	override def createLogic(inheritedAttributes: Attributes) = new GraphStageLogic(shape){

		val writer = new BinTableWriter(file, schema)

		setHandler(in, new InHandler{
			override def onPush(): Unit = {
				writer.writeRow(grab(in))
				pull(in)
			}

			override def onUpstreamFinish(): Unit = {
				if(isAvailable(in)) writer.writeRow(grab(in))
				writer.close()
			}
		})

	}
}
