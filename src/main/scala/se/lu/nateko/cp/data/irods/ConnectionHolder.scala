package se.lu.nateko.cp.data.irods

import scala.concurrent.duration.DurationInt

import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import org.irods.jargon.core.connection.IRODSSession

import akka.actor.ActorSystem
import akka.actor.Cancellable

private class ConnectionHolder(
		conn: AbstractIRODSMidLevelProtocol,
		onClose: ConnectionHolder => Unit) (implicit system: ActorSystem) {

	import system.{dispatcher, scheduler}

	private[this] var _closing: Cancellable = null
	private[this] var _session = conn.getIrodsSession

	def release(): Unit = synchronized{
		if(conn.isConnected) {
			_closing = scheduler.scheduleOnce(5 minutes)(closeConnection)
		}
	}

	def session: IRODSSession = synchronized(_session)
	def connection = synchronized(conn)

	def takeForSession(session: IRODSSession): AbstractIRODSMidLevelProtocol = synchronized{

		if(!conn.isConnected) throw new Exception("Connection has been closed, cannot use it any more")

		cancelClosing()
		conn.setIrodsSession(session)
		_session = session
		conn
	}

	def closeConnection(): Unit = synchronized{
		cancelClosing()
		if(conn.isConnected) {
			onClose(this)
		}
	}

	private def cancelClosing(): Unit = synchronized{
		if(_closing != null) {
			_closing.cancel()
			_closing = null
		}
	}
}
