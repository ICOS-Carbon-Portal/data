import {rgbaInterpolation, linearInterpolation} from 'icos-cp-spatial';
import { colorRampDefs} from './colorRampDefs';

const noValue = [255, 255, 255, 0];

export const colorRamps = colorRampDefs.reduce((acc, cr) => {
	acc.push(cr);
	acc.push({
		name: cr.name + '-rev',
		domain: cr.domain,
		colors: cr.colors.slice().reverse()
	});
	return acc;
}, []);

export const updateElement = (elementCreator) => {
	return (colorRamp) => {
		return {
			name: colorRamp.name,
			element: elementCreator(),
			domain: colorRamp.domain,
			colors: colorRamp.colors
		};
	}
};

export default class ColorMaker{
	constructor(minVal, maxVal, gamma, colorRamp, isDivergingData) {
		this._gamma = gamma;
		this._domain = [minVal, maxVal];
		this._normalize = minVal < 0 && maxVal > 0
			? linearInterpolation([minVal, 0, maxVal], [-1, 0, 1])
			: linearInterpolation(this._domain, [0, 1]);
		const cr = colorRamp === undefined
			? minVal < 0 && maxVal > 0
				// Pick the first color ramp that satisfies the current domain
				? colorRamps.find(cr => cr.domain.length === 3)
				: colorRamps.find(cr => cr.domain.length === 2)
			: colorRamp;

		this._colorize = this.getColorizer(minVal, maxVal, isDivergingData, cr);
	}

	getColorizer(minVal, maxVal, isDivergingData, colorRamp) {
		const isDivergingRange = minVal < 0 && maxVal > 0;

		if (!isDivergingRange && isDivergingData && colorRamp.colors.length === 3) {
			return minVal >= 0
				? rgbaInterpolation([0, 1], colorRamp.colors.slice(1))
				: rgbaInterpolation([0, 1], colorRamp.colors.slice(0, 2));
		}
		
		return rgbaInterpolation(colorRamp.domain, colorRamp.colors);;
	}

	makeColor(value){
		if (isNaN(value)) return noValue;
		
		const normalized = this._normalize(value);
		const corrected = normalized >= 0
			? Math.pow(normalized, this._gamma)
			: - Math.pow(- normalized, this._gamma);
		return this._colorize(corrected);
	}

	getLegend(pixelMin, pixelMax) {
		const valueMaker = linearInterpolation([pixelMin, pixelMax], this._domain);
		const pixelMaker = linearInterpolation(this._domain, [pixelMin, pixelMax]);
		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 80);
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax]);

		return {
			valueMaker,
			pixelMaker,
			domain: this._domain,
			colorMaker: pixel => this.makeColor(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		};
	}
}

export class ColorMakerRamps extends ColorMaker {
	constructor(minVal, maxVal, gamma, colorRampName, isDivergingData) {
		const filteredColorRamps = findColorRamps(minVal, maxVal, isDivergingData, colorRampName);
		const colorRampIdx = filteredColorRamps.findIndex(cr => cr.name === colorRampName);
		const selectedColorRamp = filteredColorRamps[colorRampIdx];

		super(minVal, maxVal, gamma, selectedColorRamp, isDivergingData);

		this.colorRampName = colorRampName;
		this.colorRampIdx = colorRampIdx;
		this.colorRamps = filteredColorRamps.map(cr => ({
			...cr,
			...{ colorMaker: new ColorMaker(cr.domain[0], cr.domain.slice(-1)[0], gamma, cr)}
		}));
	}
}

const findColorRamps = (minVal, maxVal, isDivergingData, colorRampName) => {
	const isDivergingRange = minVal < 0 && maxVal > 0;
	let filteredColorRamps = [];

	if (isDivergingData) {
		filteredColorRamps = filteredColorRamps.concat(colorRamps.filter(cr => cr.domain.length === 3));
	} else {
		filteredColorRamps = filteredColorRamps.concat(colorRamps.filter(cr => cr.domain.length === 2));
	}
	
	if (isDivergingRange) {
		filteredColorRamps = filteredColorRamps.concat(colorRamps.filter(cr => cr.domain.length === 3));
	} else {
		filteredColorRamps = filteredColorRamps.concat(colorRamps.filter(cr => cr.domain.length === 2));
	}
	
	if (colorRampName !== undefined) {
		const currentColorRamp = colorRamps.find(cr => cr.name === colorRampName);

		if (currentColorRamp !== undefined && currentColorRamp.domain.length !== 3 && !isDivergingData) {
			filteredColorRamps = filteredColorRamps.concat(colorRamps.filter(cr => cr.domain.length === currentColorRamp.domain.length));
		}
	}
	
	return [...new Set(filteredColorRamps)];
};
