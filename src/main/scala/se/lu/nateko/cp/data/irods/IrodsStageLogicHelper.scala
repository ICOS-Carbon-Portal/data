package se.lu.nateko.cp.data.irods

import scala.concurrent.Promise

private trait IrodsStageLogicHelper{

	val countPromise = Promise[Long]()

	protected def failResult(exc: Throwable): Unit = {
		if(!countPromise.isCompleted){
			countPromise.failure(exc)
		}
	}

	protected def doOrFailResult(todo: => Unit): Unit = {
		try{
			todo
		}catch{
			case exc: Throwable => failResult(exc)
		}
	}
}
