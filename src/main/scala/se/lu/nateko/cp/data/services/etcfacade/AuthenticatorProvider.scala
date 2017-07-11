package se.lu.nateko.cp.data.services.etcfacade

import akka.http.scaladsl.server.Directives
import akka.http.scaladsl.server.directives.Credentials.Provided
import se.lu.nateko.cp.data.EtcFacadeConfig
import java.security.MessageDigest
import java.util.Base64
import se.lu.nateko.cp.meta.core.etcupload.StationId


object AuthenticatorProvider {

	def getPassword(id: StationId, config: EtcFacadeConfig): String =
		config.stationOverrides.get(id.id).getOrElse{
			val md = MessageDigest.getInstance("SHA-256")
			md.update((config.secret + id.id).getBytes("UTF-8"))
			Base64.getUrlEncoder.encodeToString(md.digest).take(12)
		}

	def apply(config: EtcFacadeConfig): Directives.Authenticator[StationId] = {
		case creds @ Provided(StationId(id)) if(creds.verify(getPassword(id, config))) => Some(id)
		case _ => None
	}

}
