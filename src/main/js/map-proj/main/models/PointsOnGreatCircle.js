import {GreatCircle, Coord} from './GreatCircle';


export default class PointsOnGreatCircle{
	static fromJson(geoJson, maxSegmentLengthDeg){
		const coordList = JSON.parse(geoJson).coordinates;
		const merged = coordList.reduce((acc, curr) => {
			if (typeof curr[0] === 'object'){
				curr.forEach(c => acc.push([c[1], c[0]]));
			} else {
				acc.push([curr[1], curr[0]]);
			}
			return acc;
		}, []);

		return this.fromCoords(merged, maxSegmentLengthDeg);
	}

	static fromCoords(coordinates, maxSegmentLengthDeg){

		const addPoints = (maxSegmentLengthDeg, newPoints, start, stop) => {
			const gc = new GreatCircle(start, stop);
			const degrDist= gc.degrDist;

			if (degrDist > maxSegmentLengthDeg){
				const segments = Math.ceil(degrDist / maxSegmentLengthDeg);
				const segmentStep = 1 / segments;

				for (let s = 1; s <= segments; s++) {
					let newCoord = gc.interpolate(s * segmentStep);
					newPoints.push(newCoord);
				}
			} else {
				newPoints.push([stop.lon, stop.lat]);
			}
		};

		let newPoints = [];

		coordinates.reduce((prev, curr) => {
			const start = new Coord(prev[0], prev[1]);
			const stop = new Coord(curr[0], curr[1]);
			newPoints.push([start.lon, start.lat]);

			addPoints(maxSegmentLengthDeg, newPoints, start, stop);
			return curr;
		});

		return newPoints;
	}
}