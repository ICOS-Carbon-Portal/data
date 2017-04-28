import {rgbaInterpolation, linearInterpolation} from 'icos-cp-spatial';

const noValue = [255, 255, 255, 0];

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
		const valueMaker = linearInterpolation([pixelMin, pixelMax], this._domain);
		const pixelMaker = linearInterpolation(this._domain, [pixelMin, pixelMax]);
		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 80);
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax]);

		return {
			valueMaker,
			pixelMaker,
			colorMaker: pixel => this.makeColor(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		};
	}
}
