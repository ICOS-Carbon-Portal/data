import {rgbaInterpolation, linearInterpolation} from 'icos-cp-spatial';

const minimum = [255,255,178, 255];
const low = [254,204,92, 255];
const medium = [253,141,60, 255];
const high = [240,59,32, 255];
const maximum = [189,0,38, 255];
const colorDefs = [minimum, low, medium, high, maximum];

const nTickIntervals = 4;


export const colorMaker = (min, max, decimals, containerHeight) => {
	const exponent = 0.3;
	const valueCompressor = val => Math.pow(val, exponent);
	const valueStretcher = val => Math.pow(val, 1/exponent);
	//const valueCompressor = val => Math.log(val - min + 1);
	//const valueStretcher = val => Math.exp(val) + min - 1;

	const domainMin = valueCompressor(min);
	const stepSize = (valueCompressor(max) - domainMin) / (colorDefs.length - 1);
	const domain = Array.from({length: colorDefs.length}).map(
		(_, i) => domainMin + stepSize * i
	);

	const color = rgbaInterpolation(domain, colorDefs);
	const getColor = value => color(valueCompressor(value)).map(c => Math.round(c));
	const domainEdges = [domain[0], domain[domain.length - 1]];
	const valueMaker = tick =>
		valueStretcher(linearInterpolation([0, containerHeight], domainEdges)(tick)).toFixed(decimals);

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
