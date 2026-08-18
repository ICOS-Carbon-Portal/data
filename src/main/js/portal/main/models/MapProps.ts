import deepEqual from 'deep-equal';
import { SupportedSRIDs } from 'icos-cp-ol';
import type { Coordinate } from 'ol/coordinate';
import config from '../config';
import { drawRectBoxToCoords, round } from '../utils';
import type { DrawRectBbox, MapProps } from './State';
import type { DrawFeature } from './StationFilterControl';


export const stationFilterRectType = 'stationFilterRect';

type MapPropsSource = {
	srid?: SupportedSRIDs
	drawFeatures?: DrawFeature[]
}

function coordRounder(srid: SupportedSRIDs) {
	return srid === '4326'
		? (val: number) => round(val, 5)
		: (val: number) => Math.round(val);
}

export function coordsToRect(coords: Coordinate[][], srid: SupportedSRIDs): DrawRectBbox {
	const rounder = coordRounder(srid);
	const corners = coords[0];

	// Ensure corners in consistent order
	const [x1, y1] = corners[0];
	const [x2, y2] = corners[2];

	return [
		rounder(Math.min(x1, x2)),
		rounder(Math.min(y1, y2)),
		rounder(Math.max(x1, x2)),
		rounder(Math.max(y1, y2))
	];
}

export function drawFeaturesToRects(drawFeatures: DrawFeature[], srid: SupportedSRIDs): DrawRectBbox[] {
	return drawFeatures.map(drawFeature => coordsToRect(drawFeature.coords, srid));
}

export function rectsToDrawFeatures(rects: DrawRectBbox[]): DrawFeature[] {
	return rects.map(rect => ({
		id: Symbol(),
		type: stationFilterRectType,
		coords: [drawRectBoxToCoords(rect)]
	}));
}

export function deriveMapProps(source: MapPropsSource, currentMapProps: MapProps): MapProps {
	const srid = source.srid ?? config.olMapSettings.defaultSRID;
	const rects = source.drawFeatures === undefined
		? currentMapProps.rects ?? []
		: drawFeaturesToRects(source.drawFeatures, srid);

	return { srid, rects };
}

export function geoFilterChanged(prevMapProps: MapProps, mapProps: MapProps): boolean {
	const prevRects = prevMapProps.rects ?? [];
	const rects = mapProps.rects ?? [];

	if (prevRects.length === 0 && rects.length === 0) return false;

	return prevMapProps.srid !== mapProps.srid || !deepEqual(prevRects, rects);
}

export function rectsConflict(rect: DrawRectBbox, otherRect: DrawRectBbox): boolean {
	const overlapX = Math.min(rect[2], otherRect[2]) - Math.max(rect[0], otherRect[0]);
	const overlapY = Math.min(rect[3], otherRect[3]) - Math.max(rect[1], otherRect[1]);

	return overlapX >= 0 && overlapY >= 0 && (overlapX > 0 || overlapY > 0);
}
