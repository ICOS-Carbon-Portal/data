import rgbaInterpolation from '../../../common/main/maps/rgbaInterpolation';
import linearInterpolation from '../../../common/main/general/linearInterpolation';

const noValue = [255, 255, 255, 255];

export default class ColorMaker{
	constructor(minVal, maxVal, gamma){
		this._gamma = gamma;
		this._domain = [minVal, maxVal];
		this._normalize = minVal < 0 && maxVal > 0
			? linearInterpolation([minVal, 0, maxVal], [-1, 0, 1])
			: linearInterpolation(this._domain, [0, 1]);

		this._colorize = minVal < 0 && maxVal > 0
			? rgbaInterpolation([-1, 0, 1], [[44,123,182, 255], [255, 255, 191, 255], [215,25,28, 255]])
			: rgbaInterpolation([0, 1], [[255, 255, 178, 255], [189, 0, 38, 255]]);
	}

	makeColor(value){
		if(isNaN(value)) return noValue;
		const normalized = this._normalize(value);
		const corrected = normalized >= 0
			? Math.pow(normalized, this._gamma)
			: - Math.pow(- normalized, this._gamma);
		return this._colorize(corrected);
	}

	getLegend(pixelMin, pixelMax){
		const minVal = this._domain[0];
		const maxVal = this._domain[1];
		const valRange = maxVal - minVal;
		const valueMaker = linearInterpolation([pixelMin, pixelMax], this._domain);
		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 200);
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax]);

		// const nTicks = Math.floor((pixelMax - pixelMin) / 200);
		// const val2pixel = linearInterpolation(this._domain, [pixelMin, pixelMax]);
		// // const tickIntervalPixelLength =  Math.floor((pixelMax - pixelMin)) / nTicks;
		// const tickIntervalValLength = valRange / nTicks;
		// const valExp = Math.floor(Math.log(valRange) / Math.log(10));
		// const intervalExp = Math.floor(Math.log(tickIntervalValLength) / Math.log(10));
		// const decimals = valExp > 0 ? 0 : Math.abs(valExp) + 1;
		// const lowerBnds = minVal + tickIntervalValLength * 0.8;
		// const upperBnds = maxVal - tickIntervalValLength * 0.8;
		// const evenTicks = Array.from({length: nTicks}, (_, idx) => idx).map(idx => {
		// 	const val = parseFloat((minVal + (idx + 1) * tickIntervalValLength).toFixed(decimals));
		// 	if (val < lowerBnds || val > upperBnds) return null;
		// 	if (val % Math.pow(10, valExp) == 0) return val;
		// 	const steps = parseFloat((val + tickIntervalValLength / 2).toFixed(decimals)) - val;
		// 	// console.log({val, steps});
		// 	for (var i=1; i<steps; i++){
		// 		const testLower = val - i * Math.pow(10, intervalExp);
		// 		// console.log({val, steps, testLower});
		// 		if (testLower % Math.pow(10, valExp) == 0) {
		// 			return testLower;
		// 		}
		// 		const testUpper = val + i * Math.pow(10, intervalExp);
		// 		if (testUpper % Math.pow(10, valExp) == 0) {
		// 			return testUpper;
		// 		}
		// 	}
		// }).filter(val => val);
		// const allEvenTicks = [minVal].concat(evenTicks).concat([maxVal]);
		// console.log({pixelMin, pixelMax, minVal, maxVal, valRange, allEvenTicks, nTicks, tickIntervalValLength, valExp, intervalExp, decimals});

		return {
			valueMaker,
			colorMaker: pixel => this.makeColor(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		};
	}
}
