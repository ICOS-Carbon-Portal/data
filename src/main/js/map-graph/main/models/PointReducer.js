import config from '../config';

export default class PointReducer{
	constructor(map, binTableData, valueIdx, statsForAllPoints){
		this._map = map;
		this._binTableData = binTableData;
		this._valueIdx = valueIdx;
		this._statsForAllPoints = statsForAllPoints;
		this._stats = {min: Infinity, max: -Infinity, data: [], sum: 0, mean: undefined, sd: undefined};

		this._latIdx = binTableData.indices.latitude;
		this._lngIdx = binTableData.indices.longitude;
		this._dateIdx = binTableData.indices.date;

		this._bounds = {};
		this._pointsInBbox = [];
		this._pointsInWorld = [];
		this._pointCount = 0;
		this._reducedPoints = [];

		this._adjustedMinMax = undefined;

		this.main();
	}

	main(){
		this.calculateBounds();

		if (this._statsForAllPoints){
			this.getAllPoints();
			this.calculateStatistics();
			this.filterByBbox();
		} else {
			this.getPointsInBbox();
			this.calculateStatistics();
		}

		this.reducePoints();

		delete this._map;
		delete this._binTableData;
		delete this._bounds;
		delete this._valueIdx;
		delete this._pointsInBbox;
		delete this._pointsInWorld;
	}

	calculateBounds(){
		const mapBounds = this._map.getBounds();
		const latMin = mapBounds.getSouth() < -85.06 ? -85.06 : mapBounds.getSouth();
		const latMax = mapBounds.getNorth() > 85.06 ? 85.06 : mapBounds.getNorth();
		const lngMin = mapBounds.getWest();
		const lngMax = mapBounds.getEast();

		this._bounds = {latMin, latMax, lngMin, lngMax};
	}

	getAllPoints(){
		this._pointsInWorld = this._binTableData.allData.reduce((acc, curr, originalIdx) => {
			if (!isNaN(curr[this._valueIdx])){
				this._stats.min = Math.min(this._stats.min, curr[this._valueIdx]);
				this._stats.max = Math.max(this._stats.max, curr[this._valueIdx]);
				this._stats.sum += curr[this._valueIdx];
				this._stats.data.push(curr[this._valueIdx]);
				// We need the original index for communication with the graph
				acc.push(curr.concat([originalIdx]));
			}

			return acc;
		}, []);

		this._pointCount = this._pointsInWorld.length;
	}

	filterByBbox(){
		this._pointsInBbox = this._pointsInWorld.reduce((acc, curr) => {
			if (this.isInside(curr)) acc.push(curr);

			return acc;
		}, []);
	}

	isInside(point){
		return point[this._latIdx] >= this._bounds.latMin
			&& point[this._latIdx] <= this._bounds.latMax
			&& point[this._lngIdx] >= this._bounds.lngMin
			&& point[this._lngIdx] <= this._bounds.lngMax;
	}

	getPointsInBbox(){
		this._pointsInBbox = this._binTableData.allData.reduce((acc, curr, originalIdx) => {
			if (this.isInside(curr) && !isNaN(curr[this._valueIdx])){
				this._stats.min = Math.min(this._stats.min, curr[this._valueIdx]);
				this._stats.max = Math.max(this._stats.max, curr[this._valueIdx]);
				this._stats.sum += curr[this._valueIdx];
				this._stats.data.push(curr[this._valueIdx]);
				// We need the original index for communication with the graph
				acc.push(curr.concat([originalIdx]));
			}

			return acc;
		}, []);

		this._pointCount = this._pointsInBbox.length;
	}

	calculateStatistics(){
		this._stats.mean = this._stats.sum / this._pointCount;
		const sqrdSum = this._stats.data.reduce((acc, curr) => {
			acc += Math.pow(curr - this._stats.mean, 2);
			return acc;
		}, 0);
		this._stats.sd = Math.sqrt(sqrdSum / this._stats.data.length);
		delete this._stats.sum;
		delete this._stats.data;

		if (this._statsForAllPoints) {
			const outliers = [];
			const outlierThreshold = Math.abs(this._stats.sd * config.outlierSDFactor);

			this._pointsInWorld.forEach((p, idx) => {
				const otherIdx = idx > 0 ? idx - 1 : idx + 1;
				const span = Math.abs(this._pointsInWorld[otherIdx][this._valueIdx] - p[this._valueIdx]);

				if (span > outlierThreshold && Math.abs(p[this._valueIdx]) < outlierThreshold) {
					outliers.push({idx, values: p});
				}
			});

			if (outliers.length) {
				const dataArr = this._pointsInWorld.map(p => p[this._valueIdx]);
				outliers.reverse().forEach(outlier => dataArr.splice(outlier.idx, 1));
				dataArr.sort();
				this._adjustedMinMax = {min: dataArr[0], max: dataArr[dataArr.length - 1]};
			}
		}
	}

	reducePoints(){
		const factor = Math.ceil(this._pointsInBbox.length / config.maxPointsInMap);

		this._reducedPoints = this._pointsInBbox.filter((p, idx) => {
			const span = idx > 0
				? Math.abs(this._pointsInBbox[idx - 1][this._valueIdx] - p[this._valueIdx])
				: Math.abs(this._pointsInBbox[idx + 1][this._valueIdx] - p[this._valueIdx]);

			return this._pointsInBbox.length <= config.maxPointsInMap
				|| idx % factor === 0
				|| span > this._stats.sd * config.percentSD;
		});
	}

	get reducedPoints(){
		return this._reducedPoints;
	}

	get latIdx(){
		return this._latIdx;
	}

	get lngIdx(){
		return this._lngIdx;
	}

	get dateIdx(){
		return this._dateIdx;
	}

	get stats(){
		return this._stats;
	}

	get adjustedMinMax(){
		return this._adjustedMinMax;
	}
}