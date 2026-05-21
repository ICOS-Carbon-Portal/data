package se.lu.nateko.cp.data.services.upload

import akka.Done
import se.lu.nateko.cp.meta.core.crypto.Sha256Sum

import scala.collection.mutable.Set
import scala.util.Failure
import scala.util.Success
import scala.util.Try

private[upload] class ObjectLock {

	private[this] val locked = Set.empty[Sha256Sum]

	def lock(hash: Sha256Sum): Try[Done] = synchronized{
		if(locked.contains(hash)) Failure(UploadAlreadyInProgress(hash.id))
		else{
			locked.add(hash)
			Success(Done)
		}
	}

	def unlock(hash: Sha256Sum): Done = synchronized{
		locked.remove(hash)
		Done
	}
}

final case class UploadAlreadyInProgress(objectId: String)
	extends Exception(s"Object $objectId is currently already being uploaded")
