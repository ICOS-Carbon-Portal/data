package se.lu.nateko.cp.data.streams.geo

class EnvelopeCostStats {

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
