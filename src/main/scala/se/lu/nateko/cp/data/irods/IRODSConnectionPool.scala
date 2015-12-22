package se.lu.nateko.cp.data.irods

import org.irods.jargon.core.connection.IRODSProtocolManager
import org.irods.jargon.core.connection.IRODSSimpleProtocolManager
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.connection.PipelineConfiguration
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol
import org.irods.jargon.core.connection.IRODSSession
import scala.collection.concurrent.TrieMap

/**
 * A special IRODSProtocolManager implementation to make Jargon work in multi-threaded situations
 * Internally, it wraps an IRODSSimpleProtocolManager and delegates to it connection creation
 */
class IRODSConnectionPool extends IRODSProtocolManager{

	private[this] val inner = IRODSSimpleProtocolManager.instance()

	private[this] val connections = TrieMap.empty[String, AbstractIRODSMidLevelProtocol]

	/**
	* WARNING: the implementation assumes that pipelineConfiguration is always the same
	*/
	override def getIRODSProtocol(
			irodsAccount: IRODSAccount,
			pipelineConfiguration: PipelineConfiguration,
			irodsSession: IRODSSession): AbstractIRODSMidLevelProtocol = {

		val key = getKey(irodsAccount, irodsSession)
		connections.getOrElseUpdate(key, inner.getIRODSProtocol(irodsAccount, pipelineConfiguration, irodsSession))
	}
	
	private def getKey(irodsAccount: IRODSAccount, irodsSession: IRODSSession): String = {
		irodsAccount.toString + "_%mysep$_" + irodsSession.toString
	}

	override def returnIRODSProtocol(abstractIRODSMidLevelProtocol: AbstractIRODSMidLevelProtocol): Unit = {
		inner.returnIRODSProtocol(abstractIRODSMidLevelProtocol)
	}

}