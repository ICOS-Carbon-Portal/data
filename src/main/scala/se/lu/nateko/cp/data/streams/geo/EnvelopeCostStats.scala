package se.lu.nateko.cp.data.streams.geo

trait EnvelopeCostStats{
	def addCost(cost: Double): Unit
	def recommendedCostLimit: Double
}

class RunningPseudoSdDev extends EnvelopeCostStats{

	private[this] var sum: Double = 0
	private[this] var sqDiffSum: Double = 0
	private[this] var n: Int = 0

	def addCost(cost: Double): Unit = {
		sum += cost
		n += 1
		val diff = sum / n - cost
		sqDiffSum += diff * diff
	}

	def recommendedCostLimit: Double = if(n == 0) Double.MaxValue else {
		sum / n + 3 * Math.sqrt(sqDiffSum / n)
	}
}

class LastNpointsSdDev(size: Int) extends EnvelopeCostStats{

	private[this] var n: Int = 0
	private val costs: Array[Double] = Array.fill(size)(0)

	def addCost(cost: Double): Unit = {
		n += 1
		costs(n % size) = cost
	}

	def recommendedCostLimit: Double = if(n < size) Double.MaxValue else {
		val mean = costs.sum / n

		var sqDiffSum: Double = 0

		costs.foreach{cost =>
			val diff = mean - cost
			sqDiffSum += diff * diff
		}

		mean + 12 * Math.sqrt(sqDiffSum / n)
	}
}

class PriorCostFraction(fraction: Double,  extends EnvelopeCostStats{

	private[this] var sum: Double = 0
	private[this] var sqDiffSum: Double = 0
	private[this] var n: Int = 0

	def addCost(cost: Double): Unit = {
		sum += cost
		n += 1
		val diff = sum / n - cost
		sqDiffSum += diff * diff
	}

	def recommendedCostLimit: Double = if(n == 0) Double.MaxValue else {
		sum / n + 3 * Math.sqrt(sqDiffSum / n)
	}
}