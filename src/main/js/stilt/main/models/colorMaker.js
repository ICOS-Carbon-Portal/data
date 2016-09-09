import rgbaInterpolation from '../../../common/main/maps/rgbaInterpolation';
import linearInterpolation from '../../../common/main/general/linearInterpolation';

const zero = [255, 255, 255, 0];
const low = [255, 255, 178, 255];
const medium = [253, 141, 60, 255];
const high = [189, 0, 38, 255];

const logDomain = [-6, -5, -2.5, 0];

const color = rgbaInterpolation(logDomain, [zero, low, medium, high]);

export default function colorMaker(value) {
	return value == 0 ? zero : color(Math.log10(value));
}

export function getLegend(pixelMin, pixelMax){

	const logRange = [logDomain[0], logDomain[logDomain.length - 1]];

	const toLogRange = linearInterpolation([pixelMin, pixelMax], logRange);

	const valueMaker = pixel => Math.pow(10, toLogRange(pixel));

	const tickPixel = linearInterpolation(logRange, [pixelMin, pixelMax]);

	return {
		colorMaker: pixel => color(toLogRange(pixel)),
		valueMaker,
		suggestedTickLocations: Array.from({length: 7}, (_, i) => i - 6).map(tickPixel)
	};
}


