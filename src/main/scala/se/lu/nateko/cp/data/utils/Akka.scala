package se.lu.nateko.cp.data.utils

import akka.Done
import scala.concurrent.Future

object Akka {

	val done: Future[Done] = Future.successful(Done)
}
