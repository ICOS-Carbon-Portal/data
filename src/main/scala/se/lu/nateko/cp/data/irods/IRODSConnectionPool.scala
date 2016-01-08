package se.lu.nateko.cp.data.irods

import org.irods.jargon.core.connection.IRODSProtocolManager
import org.irods.jargon.core.connection.IRODSSimpleProtocolManager
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.connection.PipelineConfiguration
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import org.irods.jargon.core.connection.IRODSSession
import scala.collection.concurrent.TrieMap
import java.io.Closeable
import akka.actor.ActorSystem
import akka.actor.Cancellable
import scala.concurrent.Await
import scala.concurrent.duration.DurationInt

/**
 * A special IRODSProtocolManager implementation to make Jargon work in multi-threaded situations when
 * the same connection may be used by different threads (at least, non-concurrently)
 * Internally, it wraps an IRODSSimpleProtocolManager and delegates to it connection creation
 */
class IRODSConnectionPool(implicit system: ActorSystem) extends IRODSProtocolManager with Closeable{

	import system.dispatcher
	system.registerOnTermination(close)

	private[this] val inner = IRODSSimpleProtocolManager.instance()

	private[this] val pools = TrieMap.empty[String, PerAccountPool]

	private def getPool(account: IRODSAccount): PerAccountPool = pools.getOrElseUpdate(
		account.toString,
		new PerAccountPool(
			inner.getIRODSProtocol(account, _, _),
			inner.returnIRODSProtocol
		)
	)

	override def getIRODSProtocol(
			irodsAccount: IRODSAccount,
			pipeConf: PipelineConfiguration,
			session: IRODSSession): AbstractIRODSMidLevelProtocol = {

		val connFut = getPool(irodsAccount).getConnection(pipeConf, session)
		Await.result(connFut, 10 minutes)
	}

	override def returnIRODSProtocol(conn: AbstractIRODSMidLevelProtocol): Unit = {
		getPool(conn.getIrodsAccount).releaseConnection(conn.getIrodsSession)
	}

	override def close(): Unit = synchronized{
		pools.values.foreach(_.close())
		pools.clear()
	}

	def closeForSession(session: IRODSSession): Unit = {
		pools.values.foreach(_.releaseConnection(session, close = true))
	}

	def releaseForSession(session: IRODSSession): Unit = {
		pools.values.foreach(_.releaseConnection(session, close = false))
	}
}
