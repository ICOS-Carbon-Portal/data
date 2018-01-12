package se.lu.nateko.cp.data.streams.geo

trait EnvelopePolygonConfig {
	/**
	 * For a candidate edge for removal, the maximum angle, in radians, from the
	 * direction of the previous edge to the direction of the next edge. If the
	 * angle is larger than the maximum, the cost of removal of the candidate edge
	 * becomes Double.MaxValue
	 */
	def maxAngleForEdgeRemoval: Double

	/**
	 * The threshold minimal absolute value of the angle between to lines when usage
	 * of the simple line-line intersection (numerically unstable but cheap) algorithm
	 * is still acceptable. Otherwise, the more expensive versions get used.
	 */
	def minAngleForSimpleLineLineIntersection: Double

	/**
	 * When adding a new vertice, the minimal distance-squared from the vertice to
	 * the polygon, below which the vertice gets discarded.
	 */
	def minSquaredDistanceForNewVertice: Double

	/**
	 * A small number used to perform "nano-shifts" during vertice additions to remove
	 * "degeneracies" in the resulting polygon but keeping the areas of the "protrusions"
	 * very close to zero.
	 */
	def epsilon: Double

	/**
	 * A maximum (small) angle (in radians) between the edge directions of a convex vertice
	 * that is allowed to be neglected, so that the vertice can be effectively considered
	 * concave and eligible for removal. Must be greater than or equal to zero.
	 */
	def convexnessToleranceAngle: Double

	/**
	 * During edge removal cost evaluation, a contribution factor of squared distance from the newly
	 * created vertice to the nearest original point (or some fictional representation of the latter).
	 */
	def distanceCostFactor: Double
}
