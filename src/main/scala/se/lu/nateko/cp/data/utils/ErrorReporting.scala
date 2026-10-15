package se.lu.nateko.cp.data.utils

import _root_.io.sentry.Sentry
import _root_.io.sentry.SentryLevel

import java.net.URI
import java.util.concurrent.ExecutionException
import scala.jdk.CollectionConverters.SeqHasAsJava

/**
 * Reports errors to Sentry with explicit grouping, instead of relying on Sentry's message-based grouping.
 * Every report is identified by where it happened (component and operation) and what failed (failure),
 * e.g. etc-facade / register-upload / metadata-not-found. These form the Sentry fingerprint (one issue per
 * combination), and are also set as tags, so that the same failure can be found across components,
 * e.g. by searching for failure:meta-unreachable.
 */
object ErrorReporting:

	/** Where the error happened, e.g. ErrorSite("etc-facade", "register-upload") */
	final case class ErrorSite(component: String, operation: String)

	/** What failed. Transient failures are reported as warnings, others as errors. */
	final case class Failure(name: String, transient: Boolean)

	@volatile private var services = Map.empty[(String, Int), String]

	/** Registers a known service, so that connection failures to it are named after it (e.g. meta-unreachable) */
	def registerService(name: String, baseUrl: String): Unit =
		val uri = URI.create(baseUrl)
		val port = if uri.getPort >= 0 then uri.getPort else if uri.getScheme == "https" then 443 else 80
		services = services + ((uri.getHost, port) -> name)

	/**
	 * @param groupBy tags that, on top of site and failure, make a separate Sentry issue (e.g. station)
	 * @param tags additional tags that do not affect grouping (e.g. file name)
	 */
	def report(
		err: Throwable,
		site: ErrorSite,
		failure: Failure,
		groupBy: Seq[(String, String)] = Nil,
		tags: Seq[(String, String)] = Nil
	): Unit =
		Sentry.captureException(err, scope =>
			val fingerprint = Seq(site.component, site.operation, failure.name) ++ groupBy.map(_._2)
			scope.setFingerprint(fingerprint.asJava)
			scope.setLevel(if failure.transient then SentryLevel.WARNING else SentryLevel.ERROR)
			scope.setTag("component", site.component)
			scope.setTag("operation", site.operation)
			scope.setTag("failure", failure.name)
			(groupBy ++ tags).foreach((key, value) => scope.setTag(key, value))
		)

	/** Classifies errors that can occur anywhere in the service; falls back to the exception type */
	def classify(err: Throwable): Failure =
		val chain = causeChain(err)
		chain.iterator.map(classifyKnown).collectFirst{case Some(f) => f}.getOrElse{
			Failure(kebabCase(chain.lastOption.getOrElse(err).getClass.getSimpleName), transient = false)
		}

	private def classifyKnown(err: Throwable): Option[Failure] =
		val msg = Option(err.getMessage).getOrElse("")
		def remote(problem: String) = Some(Failure(s"${remoteName(msg)}-$problem", transient = true))
		err.getClass.getSimpleName match
			case "StreamTcpException" if msg.contains("Connect(") => remote("unreachable")
			case "TcpIdleTimeoutException" => remote("timeout")
			case "BufferOverflowException" if msg.contains("max-open-requests") => remote("pool-overflow")
			case "UnexpectedConnectionClosureException" => Some(Failure("connection-closed", transient = true))
			case _ if msg.startsWith("SPARQL server error") && msg.contains("timely response") =>
				Some(Failure("sparql-timeout", transient = true))
			case _ if msg.startsWith("Metadata server error") => Some(Failure("meta-error", transient = false))
			case _ => None

	private val Endpoint = """([\w.-]+)(?:/[^:,\s\]]*)?[:,](\d{2,5})""".r

	private[utils] def remoteName(msg: String): String =
		Endpoint.findFirstMatchIn(msg).fold("remote"){m =>
			val endpoint = (m.group(1), m.group(2).toInt)
			services.getOrElse(endpoint, s"${endpoint._1}:${endpoint._2}")
		}

	private def causeChain(err: Throwable): List[Throwable] =
		Iterator.iterate(err)(_.getCause).takeWhile(_ != null).take(20).toList
			.filterNot(_.isInstanceOf[ExecutionException])

	private def kebabCase(name: String): String =
		name.replaceAll("([a-z0-9])([A-Z])", "$1-$2").toLowerCase

end ErrorReporting
