import sbt.internal.util.ExitHook
import scala.sys.process.Process
import java.lang.{Process => JProcess, ProcessBuilder}

class KillUnixProcWithChildren(val pid: Int) extends ExitHook{
	def runBeforeExiting(): Unit = UnixProcessWithChildren.terminate(pid)

	override def equals(x: Any): Boolean = x match{
		case other: KillUnixProcWithChildren => other.pid == pid
		case _ => false
	}

	override def hashCode(): Int = pid
}

class UnixProcessWithChildren(val pid: Int, proc: JProcess){

	val exitHook = new KillUnixProcWithChildren(pid)

	def isAlive: Boolean = proc.isAlive()

	def killAndWaitFor(): Int = {
		if(proc.isAlive()) UnixProcessWithChildren.terminate(pid)
		proc.waitFor()
	}
}

object UnixProcessWithChildren{

	def terminate(pid: Int): Unit = {
		(Process(s"pkill --signal SIGTERM -P $pid") ### Process (s"kill -s SIGTERM $pid")).!
	}

	def run(dir: java.io.File, command: String*): UnixProcessWithChildren = {
		val pb = new ProcessBuilder(command: _*)
		pb.directory(dir)
		pb.redirectOutput(ProcessBuilder.Redirect.INHERIT)
		val proc = pb.start()
		val pidField = proc.getClass.getDeclaredField("pid")
		pidField.setAccessible(true)
		val pid = pidField.getInt(proc)
		new UnixProcessWithChildren(pid, proc)
	}

	implicit class ExitHooksProcReplacementOpt(val set: Set[ExitHook]) extends AnyVal{

		def replaceProcToKill(kill: KillUnixProcWithChildren): Set[ExitHook] = dropProcessKilling + kill

		def dropProcessKilling: Set[ExitHook] = set.filter{
			case _: KillUnixProcWithChildren => false
			case _ => true
		}
	}
}
