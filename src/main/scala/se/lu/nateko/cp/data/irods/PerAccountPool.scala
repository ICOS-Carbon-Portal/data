package se.lu.nateko.cp.data.irods

import org.irods.jargon.core.connection.PipelineConfiguration
import org.irods.jargon.core.connection.IRODSSession
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import akka.actor.ActorSystem
import scala.concurrent.Future
import scala.concurrent.Promise
import scala.util.Success

object PerAccountPool{
	private val yes = Promise.successful(())
	def later = Promise[Unit]()
	val MaxConnections = 10
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

	/**
	 * Important: one must wait for every `Future` obtained from this method before calling it again
	 */
	def getConnection(pipeConf: PipelineConfiguration, session: IRODSSession): Future[AbstractIRODSMidLevelProtocol] = synchronized{
		_occupied.get(session) match{
			case Some(connHolder) => Future.successful(connHolder.connection)
			case None =>
				if(_available.isEmpty){
					createNewConn(() => creator(pipeConf, session))
				}else {
					val holder = _available.head
					_available -= holder
					val conn = holder.takeForSession(session)
					_occupied += ((session, holder))
					Future.successful(conn)
				}
		}
	}

	def releaseConnection(session: IRODSSession): Unit = synchronized{
		_occupied.get(session).foreach(conn => {
			conn.release()
			_available += conn
			_occupied -= session
			if(!_canGetConnection.isCompleted) {
				_canGetConnection.success(())
				_canGetConnection = yes
			}
		})
	}

	def close(): Unit = synchronized{
		_occupied.values.foreach(_.closeConnection)
		_available.foreach(_.closeConnection)
		_occupied = Map.empty
		_available = Set.empty
	}

	private def createNewConn(connMaker: () => AbstractIRODSMidLevelProtocol): Future[AbstractIRODSMidLevelProtocol] = {
		_canGetConnection.future.map(_ => synchronized{
			if(_occupied.size >= MaxConnections) throw new IllegalStateException(
				"Probably the connections were asked for to eagerly. " +
				"Try waiting for connection before asking for another one"
			)
			val conn = connMaker()
			val holder = new ConnectionHolder(conn, removeConn)
			_occupied += ((conn.getIrodsSession, holder))
			_canGetConnection = if(_occupied.size < MaxConnections) yes else later
			conn
		})
	}

	private def removeConn(holder: ConnectionHolder): Unit = synchronized{
		_available -= holder
		_occupied -= holder.session
		connShutdowner(holder.connection)
	}
}
