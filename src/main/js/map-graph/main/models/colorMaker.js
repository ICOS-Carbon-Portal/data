import {rgbaInterpolation, linearInterpolation} from 'icos-cp-spatial';

const minimum = [255,255,178, 255];
const low = [254,204,92, 255];
const medium = [253,141,60, 255];
const high = [240,59,32, 255];
const maximum = [189,0,38, 255];
const colorDefs = [minimum, low, medium, high, maximum];

const nTickIntervals = 4;

export const colorMaker = (min, max, decimals, containerHeight) => {
	const stepSize = (max - min) / (colorDefs.length - 1);
	const domain = Array.from({length: colorDefs.length - 1}).reduce(acc => {
		acc.push(acc[acc.length - 1] + stepSize);
		return acc;
	}, [min]);

	const color = rgbaInterpolation(domain, colorDefs);
	const getColor = value => {
		if (value < min){
			return [255, 255, 255, 255];
		} else if (value > max){
			return [0, 0, 0, 255];
		} else {
			return color(value).map(c => Math.round(c));
		}
	};
	const domainEdges = [domain[0], domain[domain.length - 1]];
	const valueMaker = tick => linearInterpolation([0, containerHeight], domainEdges)(tick).toFixed(decimals);

	const pixelMaker = linearInterpolation(domainEdges, [0, containerHeight]);
	const toPixel = linearInterpolation([0, nTickIntervals], [0, containerHeight]);

	return {
		getColor,
		getLegend: () => {
			return {
				min,
				max,
				valueMaker,
				pixelMaker,
				colorMaker: pixel => getColor(valueMaker(pixel)),
				suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
			}
		}
	};
};
