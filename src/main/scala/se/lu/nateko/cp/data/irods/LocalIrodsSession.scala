package se.lu.nateko.cp.data.irods;

import org.irods.jargon.core.connection.IRODSSession
import org.irods.jargon.core.connection.IRODSAccount
import org.irods.jargon.core.connection.AbstractIRODSMidLevelProtocol

/**
 * The purpose of this class is to stop using the global mutable state in `IRODSSession.sessionMap`
 *
 * This session is supposed to be very short-lived, created and closed for every `IrodsClient` operation.
 *
 * Also, every instance of it is meant to be used with a single `IRODSAccount` and a single connection
 * (`AbstractIRODSMidLevelProtocol`).
 *
 * `IRODSConnectionPool` is supposed to handle connection lifecycle and reuse.
 */
private class LocalIrodsSession(connManager: IRODSConnectionPool) extends IRODSSession(connManager) {

	private val pipelineConfig = buildPipelineConfigurationBasedOnJargonProperties()

	override def closeSession(): Unit = connManager.releaseForSession(this)

	override def closeSession(account: IRODSAccount): Unit = connManager.releaseForSession(this)

	override def currentConnection(account: IRODSAccount): AbstractIRODSMidLevelProtocol =
		connManager.getIRODSProtocol(account, pipelineConfig, this)

	override def discardSessionForErrors(account: IRODSAccount): Unit = connManager.closeForSession(this)

	override def getIRODSCommandsMap: java.util.Map[String, AbstractIRODSMidLevelProtocol] = null
}
