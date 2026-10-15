package se.lu.nateko.cp.data.test.utils

import akka.stream.BufferOverflowException
import akka.stream.StreamTcpException
import akka.stream.scaladsl.TcpIdleTimeoutException
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.api.CpDataException
import se.lu.nateko.cp.data.utils.ErrorReporting
import se.lu.nateko.cp.data.utils.ErrorReporting.Failure

import java.nio.file.NoSuchFileException
import scala.concurrent.duration.DurationInt

class ErrorReportingTests extends AnyFunSuite:
	ErrorReporting.registerService("meta", "http://127.0.0.1:9094/")

	private def wrapped(err: Throwable) = new Exception("outer wrapper", err)

	test("connection failures to a registered service are named after it, even when wrapped"){
		val connect = new StreamTcpException(
			"Tcp command [Connect(127.0.0.1/<unresolved>:9094,None,List(),Some(10 seconds),true)] failed because of akka.io.TcpOutgoingConnection$$anon$2: Connect timeout of Some(10 seconds) expired"
		)
		assert(ErrorReporting.classify(wrapped(connect)) == Failure("meta-unreachable", transient = true))
	}

	test("idle timeouts and pool overflows are classified as transient"){
		val idle = new TcpIdleTimeoutException(
			"TCP idle-timeout encountered on connection to [127.0.0.1/<unresolved>:9094], no bytes passed in the last 60 seconds", 60.seconds
		)
		val pool = new BufferOverflowException(
			"Exceeded configured max-open-requests value of [32]. This means that the request queue of this pool (HostConnectionPoolSetup(127.0.0.1,9094,ConnectionPoolSetup(...)))"
		)
		assert(ErrorReporting.classify(idle) == Failure("meta-timeout", transient = true))
		assert(ErrorReporting.classify(pool) == Failure("meta-pool-overflow", transient = true))
	}

	test("unregistered endpoints are named by host and port"){
		val connect = new StreamTcpException("Tcp command [Connect(10.0.0.5/<unresolved>:8080,None)] failed")
		assert(ErrorReporting.classify(connect).name == "10.0.0.5:8080-unreachable")
	}

	test("service error messages are recognized"){
		val sparql = new CpDataException("SPARQL server error: The server was not able to produce a timely response to your request.")
		assert(ErrorReporting.classify(sparql) == Failure("sparql-timeout", transient = true))
		val meta = new CpDataException("Metadata server error: \nsomething went wrong")
		assert(ErrorReporting.classify(meta) == Failure("meta-error", transient = false))
	}

	test("unknown errors fall back to the innermost exception type"){
		val err = wrapped(new NoSuchFileException("/disk/data/x.csv"))
		assert(ErrorReporting.classify(err) == Failure("no-such-file-exception", transient = false))
	}
