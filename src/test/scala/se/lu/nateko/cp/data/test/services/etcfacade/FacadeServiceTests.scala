package se.lu.nateko.cp.data.test.services.etcfacade

import org.scalatest.funspec.AnyFunSpec
import se.lu.nateko.cp.data.services.etcfacade.FacadeService
import se.lu.nateko.cp.data.services.upload.UploadAlreadyInProgress

class FacadeServiceTests extends AnyFunSpec:

	describe("isAlreadyUploading"):

		it("returns true for direct UploadAlreadyInProgress"):
			assert(FacadeService.isAlreadyUploading(new UploadAlreadyInProgress("x")))

		it("returns true for wrapped UploadAlreadyInProgress"):
			val err = new Exception("outer", new Exception("inner", new UploadAlreadyInProgress("x")))
			assert(FacadeService.isAlreadyUploading(err))

		it("returns false for unrelated exception"):
			assert(!FacadeService.isAlreadyUploading(new RuntimeException("boom")))

		it("returns false for null"):
			assert(!FacadeService.isAlreadyUploading(null))
