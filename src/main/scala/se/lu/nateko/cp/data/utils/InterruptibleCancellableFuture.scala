/*
Copyright 2018 Viktor Klang

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

package se.lu.nateko.cp.data.utils

import scala.concurrent._
import java.util.concurrent.CancellationException

final class Interrupt extends (() => Boolean) {
  private[this] final var state: AnyRef = null
  override final def apply(): Boolean = this.synchronized {
    state match {
      case null        =>
        state = this
        true
      case _: this.type => false
      case t: Thread   =>
        state = this
        t.interrupt()
        true
    }
  }
  private[this] final def enter(): Boolean =
   this.synchronized {
     state match {
        case _: this.type => false
        case null =>
         state = Thread.currentThread
         true
     }
  }

  private[this] final def exit(): Boolean =
   this.synchronized {
     state match {
       case _: this.type => false
       case _: Thread =>
         state = this
         true
     }
  }

  def interruptibly[T](body: =>T): T =
    if (enter()) {
      try body catch {
        case _: InterruptedException => throw new CancellationException()
      } finally {
        if(!exit() && Thread.interrupted())
          () // If we were interrupted and flag was not cleared
      }
    } else throw new CancellationException()
}

object InterruptibleCancellableFuture{

	def interruptibly[T](body: => T)(implicit ec: ExecutionContext): (Future[T], () => Boolean) = {
		val interrupt = new Interrupt()
		(Future(interrupt.interruptibly(body))(ec), interrupt)
	}

}
