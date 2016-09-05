import rgbaInterpolation from '../../../common/main/maps/rgbaInterpolation';

const zero = [255, 255, 255, 0];
const low = [255, 255, 178, 255];
const medium = [253, 141, 60, 255];
const high = [189, 0, 38, 255];

const color = rgbaInterpolation([-5, -4, -2, 0], [zero, low, medium, high]);

export default function colorMaker(value) {
	return value == 0 ? zero : color(Math.log10(value));
}

