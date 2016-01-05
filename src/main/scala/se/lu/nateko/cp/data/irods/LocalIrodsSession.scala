package se.lu.nateko.cp.data.irods;

import org.irods.jargon.core.connection.IRODSSession
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol

/**
 * The purpose of this class is to stop using the global mutable state in <code>IRODSSession.sessionMap</code>
 */
private class LocalIrodsSession(connManager: IRODSConnectionPool) extends IRODSSession(connManager) {

	private val pipelineConfig = buildPipelineConfigurationBasedOnJargonProperties()

	override def closeSession(): Unit = connManager.close()

	override def closeSession(account: IRODSAccount): Unit = connManager.closeForAccount(account)

	override def currentConnection(account: IRODSAccount): AbstractIRODSMidLevelProtocol =
		connManager.getIRODSProtocol(account, pipelineConfig, this)

	override def discardSessionForErrors(account: IRODSAccount): Unit = connManager.closeForAccount(account)

	override def getIRODSCommandsMap: java.util.Map[String, AbstractIRODSMidLevelProtocol] = null
}
