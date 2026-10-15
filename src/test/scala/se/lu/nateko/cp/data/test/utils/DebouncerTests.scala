package se.lu.nateko.cp.data.test.utils

import akka.actor.ActorSystem
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite
import se.lu.nateko.cp.data.utils.akka.Debouncer
import scala.concurrent.{Await, Future, Promise}
import scala.concurrent.duration.*
import java.util.concurrent.atomic.AtomicInteger

class DebouncerTests extends AnyFunSuite with BeforeAndAfterAll:
	private val system = ActorSystem("debouncer-tests")
	given scala.concurrent.ExecutionContext = system.dispatcher
	private def await[T](f: Future[T]): T = Await.result(f, 3.seconds)

	override def afterAll(): Unit =
		await(system.terminate())
		super.afterAll()

	test("forced work supersedes the pending timer and completes its waiters"){
		val d = new Debouncer[String, Int](200.millis, system.scheduler)
		val calls = new AtomicInteger
		val pending = d.debounce("a"){calls.incrementAndGet(); Future.successful(1)}
		assert(await(d.runNow("a")(Future.successful(2))) == 2)
		assert(await(pending) == 2)
		Thread.sleep(400)
		assert(calls.get == 0)
	}

	test("normal arrivals remain delayed and only the latest job executes"){
		val d = new Debouncer[String, Int](200.millis, system.scheduler)
		val calls = new AtomicInteger
		val first = d.debounce("a"){calls.incrementAndGet(); Future.successful(1)}
		val last = d.debounce("a"){calls.incrementAndGet(); Future.successful(2)}
		assert(!last.isCompleted)
		assert(await(first) == 2)
		assert(await(last) == 2)
		assert(calls.get == 1)
	}

	test("forced work waits for running work, even when that work fails"){
		val d = new Debouncer[String, Int](1.hour, system.scheduler)
		val gate = Promise[Int]()
		val running = d.runNow("a")(gate.future)
		val calls = new AtomicInteger
		val forced = d.runNow("a"){calls.incrementAndGet(); Future.successful(2)}
		assert(calls.get == 0)
		gate.failure(new RuntimeException("expected"))
		assert(await(forced) == 2)
		assert(calls.get == 1)
	}

	test("normal arrivals during running work are queued and delayed after it"){
		val d = new Debouncer[String, Int](200.millis, system.scheduler)
		val gate = Promise[Int]()
		val running = d.runNow("a")(gate.future)
		val calls = new AtomicInteger
		val first = d.debounce("a"){calls.incrementAndGet(); Future.successful(1)}
		val last = d.debounce("a"){calls.incrementAndGet(); Future.successful(2)}
		gate.success(0)
		assert(await(running) == 0)
		assert(!last.isCompleted)
		assert(await(first) == 2)
		assert(await(last) == 2)
		assert(calls.get == 1)
	}

	test("synchronous exceptions release the key for subsequent work"){
		val d = new Debouncer[String, Int](1.hour, system.scheduler)
		intercept[IllegalArgumentException]{await(d.runNow("a")(throw new IllegalArgumentException))}
		assert(await(d.runNow("a")(Future.successful(3))) == 3)
	}
