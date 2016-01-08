package se.lu.nateko.cp.data.irods

import scala.annotation.migration
import scala.concurrent.Future
import scala.concurrent.Promise

import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import org.irods.jargon.core.connection.IRODSSession
import org.irods.jargon.core.connection.PipelineConfiguration

import akka.actor.ActorSystem


object PerAccountPool{

	private val yes = Promise.successful(())

	def later = Promise[Unit]()

	val MaxConnections = 7

}


private class PerAccountPool(
		creator: (PipelineConfiguration, IRODSSession) => AbstractIRODSMidLevelProtocol,
		connShutdowner: AbstractIRODSMidLevelProtocol => Unit
	)(implicit system: ActorSystem){

	import PerAccountPool._
	import system.dispatcher

	private[this] var _available: Set[ConnectionHolder] = Set.empty
	private[this] var _occupied: Map[IRODSSession, ConnectionHolder] = Map.empty
	private[this] var _canGetConnection: Promise[Unit] = yes

	def getConnection(pipeConf: PipelineConfiguration, session: IRODSSession): Future[AbstractIRODSMidLevelProtocol] = synchronized{
		_occupied.get(session) match{

			case Some(connHolder) => Future.successful(connHolder.connection)

			case None => _canGetConnection.future.flatMap(_ => synchronized{

				//someone else was faster to get the connection, rescheduling!
				if(!canGetConnectionNow) getConnection(pipeConf, session)

				else if(_available.isEmpty){
					val conn = creator(pipeConf, session)
					val holder = new ConnectionHolder(conn, removeConn)
					_occupied += ((conn.getIrodsSession, holder))
					_canGetConnection = if(canGetConnectionNow) yes else later
					Future.successful(conn)

				} else{
					val holder = _available.head
					_available -= holder
					val conn = holder.takeForSession(session)
					_occupied += ((session, holder))
					Future.successful(conn)
				}
			})
		}
	}

	def releaseConnection(session: IRODSSession, close: Boolean = false): Unit = synchronized{
		_occupied.get(session).foreach(connHolder => {
			connHolder.release()
			_available += connHolder
			_occupied -= session
			if(close) removeConn(connHolder)
			else allowGettingConnection()
		})
	}

	def close(): Unit = synchronized{
		_occupied.values.foreach(_.closeConnection)
		_available.foreach(_.closeConnection)
		_occupied = Map.empty
		_available = Set.empty
	}

	private def allowGettingConnection(): Unit = {
		if(!_canGetConnection.isCompleted && canGetConnectionNow) {
			val oldPromise = _canGetConnection
			_canGetConnection = yes
			oldPromise.success(())
		}
	}

	private def canGetConnectionNow: Boolean = {
		_available.size > 0 || _occupied.size < MaxConnections
	}

	private def removeConn(holder: ConnectionHolder): Unit = synchronized{
		_available -= holder
		_occupied -= holder.session
		Future(connShutdowner(holder.connection))
		allowGettingConnection()
	}
}
