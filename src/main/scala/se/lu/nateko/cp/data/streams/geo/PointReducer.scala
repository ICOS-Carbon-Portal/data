package se.lu.nateko.cp.data.streams.geo


object PointReducer {

	def nextState(state: PointReducerState, lat: Float, lon: Float): PointReducerState = {
		import state._
		lats += lat
		lons += lon

		val idx = n
		n += 1

		shortList += idx
		costs += idx -> Double.MaxValue

		if(idx > 1) updateCost(shortList.length - 2) //just added third (or subsequent) point

		if(shortList.length == nmax + 1){

			val removePos = (1 to nmax - 1) //the first and the last are protected, anyway
				.minBy(pos => costs(shortList(pos)))

			//old cost not interesting, saving memory
			costs -= shortList.remove(removePos) //now shortlist is back to nmax elems

			if(removePos > 1) //second in shortlist, or later
				updateCost(removePos - 1)

			if(removePos < nmax - 1) //next-last in shortlist, or earlier
				updateCost(removePos)
		}

		state
	}
}
