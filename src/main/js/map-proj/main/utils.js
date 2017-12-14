import proj from "ol/proj";
import PointsOnGreatCircle from "./models/PointsOnGreatCircle";

export const calculateMinMax = (bBox4326, projection) => {
	// Bounding box in SRID 4326 for SRID 3035 (Lambert)
	// [[-16.1, 32.88], [-16.1, 84.17], [39.65, 84.17], [39.65, 32.88], [-16.1, 32.88]];
	const pointsOnGreatCircle4326 = PointsOnGreatCircle.fromCoords(bBox4326, 1);
	const pointsOnGreatCircleProj = pointsOnGreatCircle4326.map(c => proj.transform(c, 'EPSG:4326', projection));
	return pointsOnGreatCircleProj.reduce((acc, curr) => {
		if (curr[0] < acc.minX) acc.minX = curr[0];
		if (curr[1] < acc.minY) acc.minY = curr[1];
		if (curr[0] > acc.maxX) acc.maxX = curr[0];
		if (curr[1] > acc.maxY) acc.maxY = curr[1];

		return acc;
	}, {minX: Number.MAX_VALUE, minY: Number.MAX_VALUE, maxX: 0, maxY: 0});
};