package se.lu.nateko.cp.data.irods

import org.irods.jargon.core.connection.IRODSProtocolManager
import org.irods.jargon.core.connection.IRODSSimpleProtocolManager
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.connection.PipelineConfiguration
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import org.irods.jargon.core.connection.IRODSSession
import scala.collection.concurrent.TrieMap
import java.io.Closeable

/**
 * A special IRODSProtocolManager implementation to make Jargon work in multi-threaded situations
 * Internally, it wraps an IRODSSimpleProtocolManager and delegates to it connection creation
 */
private class IRODSConnectionPool extends IRODSProtocolManager with Closeable{

	private[this] val inner = IRODSSimpleProtocolManager.instance()

	private[this] val connections = TrieMap.empty[String, AbstractIRODSMidLevelProtocol]

	override def getIRODSProtocol(
			irodsAccount: IRODSAccount,
			pipelineConfiguration: PipelineConfiguration,
			irodsSession: IRODSSession): AbstractIRODSMidLevelProtocol = {

		connections.getOrElseUpdate(
			irodsAccount.toString,
			inner.getIRODSProtocol(irodsAccount, pipelineConfiguration, irodsSession)
		)
	}

	override def returnIRODSProtocol(abstractIRODSMidLevelProtocol: AbstractIRODSMidLevelProtocol): Unit = {
		inner.returnIRODSProtocol(abstractIRODSMidLevelProtocol)
	}

	override def close(): Unit = {
		connections.values.foreach(returnIRODSProtocol)
		connections.clear()
	}

	def closeForAccount(account: IRODSAccount): Unit = {
		val key = account.toString
		connections.get(key).foreach(returnIRODSProtocol)
		connections -= key
	}

}