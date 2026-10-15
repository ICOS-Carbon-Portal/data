package se.lu.nateko.cp.data.services.etcfacade

import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.utils.ErrorReporting.Failure

class FacadeErrorClassificationTests extends AnyFunSuite:
	import FacadeService.{EtcStageFailure, classifyFailure, stageOf}

	private val metadataNotFound = new CpDataException(
		"Metadata server error: \nCould not find ETC file metadata for hashSum=svZ37 fileName=IT-Cp2_BM_20260922_L06_F01.dat station=IT-Cp2"
	)

	test("missing ETC metadata is a station-specific, non-transient failure"){
		val err = new EtcStageFailure("register-upload", "ETC metadata registration failed", metadataNotFound)
		assert(classifyFailure(err) == Failure("metadata-not-found", transient = false))
	}

	test("the failing stage is found in the cause chain"){
		val err = new Exception("outer", new EtcStageFailure("package-daily", "lookup failed", new RuntimeException("boom")))
		assert(stageOf(err).contains("package-daily"))
		assert(stageOf(new RuntimeException("no stage")).isEmpty)
	}
