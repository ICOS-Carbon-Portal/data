package se.lu.nateko.cp.data.irods

import org.irods.jargon.core.connection.PipelineConfiguration
import org.irods.jargon.core.connection.IRODSSession
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import akka.actor.ActorSystem


private class PerAccountPool(
		creator: (PipelineConfiguration, IRODSSession) => AbstractIRODSMidLevelProtocol
	)(implicit system: ActorSystem){

	private[this] var _available: Set[ConnectionHolder] = Set.empty
	private[this] var _occupied: Map[IRODSSession, ConnectionHolder] = Map.empty

	def getConnection(pipeConf: PipelineConfiguration, session: IRODSSession): AbstractIRODSMidLevelProtocol = synchronized{
		_occupied.get(session) match{
			case Some(connHolder) => connHolder.takeForSession(session)
			case None =>
				if(_available.isEmpty){
					val conn = creator(pipeConf, session)
					val holder = new ConnectionHolder(conn, removeConn)
					_occupied += ((session, holder))
					conn
				}else {
					val holder = _available.head
					_available -= holder
					val conn = holder.takeForSession(session)
					_occupied += ((session, holder))
					conn
				}
		}
	}

	def releaseConnection(session: IRODSSession): Unit = synchronized{
		_occupied.get(session).foreach(conn => {
			conn.release()
			_available += conn
			_occupied -= session
		})
	}

	def close(): Unit = synchronized{
		_occupied.values.foreach(_.closeConnection)
		_available.foreach(_.closeConnection)
		_occupied = Map.empty
		_available = Set.empty
	}

	private def removeConn(holder: ConnectionHolder): Unit = synchronized{
		_available -= holder
	}
}
