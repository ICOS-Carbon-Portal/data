import {rgbaInterpolation, linearInterpolation} from 'icos-cp-spatial';

const noValue = [255, 255, 255, 0];

export const colorRamps = [
	{
		name: 'blueYellowRed',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[44,123,182, 255], [255, 255, 191, 255], [215,25,28, 255]]
	},
	{
		name: 'BrBG',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[90,180,172, 255], [245,245,245, 255], [216,179,101, 255]]
	},
	{
		name: 'PiYG',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[161,215,106, 255], [247,247,247, 255], [233,163,201, 255]]
	},
	{
		name: 'PRGn',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[127,191,123, 255], [247,247,247, 255], [175,141,195, 255]]
	},
	{
		name: 'PuOr',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[153,142,195, 255], [247,247,247, 255], [241,163,64, 255]]
	},
	{
		name: 'RdBu',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[103,169,207, 255], [247,247,247, 255], [239,138,98, 255]]
	},
	{
		name: 'RdGy',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[153,153,153, 255], [255,255,255, 255], [239,138,98, 255]]
	},
	{
		name: 'RdYlBu',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[145,191,219, 255], [255,255,191, 255], [252,141,89, 255]]
	},
	{
		name: 'RdYlGn',
		colorMaker: undefined,
		domain: [-1, 0, 1],
		colors: [[145,207,96, 255], [255,255,191, 255], [252,141,89, 255]]
	},
	{
		name: 'yellowRed',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[255, 255, 178, 255], [189, 0, 38, 255]]
	},
	{
		name: 'BuGn',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[44,162,95, 255], [153,216,201, 255], [229,245,249, 255]]
	},
	{
		name: 'BuPu',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[136,86,167, 255], [158,188,218, 255], [224,236,244, 255]]
	},
	{
		name: 'GnBu',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[67,162,202, 255], [168,221,181, 255], [224,243,219, 255]]
	},
	{
		name: 'OrRd',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[227,74,51, 255], [253,187,132, 255], [254,232,200, 255]]
	},
	{
		name: 'Blues',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[49,130,189, 255], [158,202,225], [222,235,247, 255]]
	},
	{
		name: 'Greens',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[49,163,84, 255], [161,217,155, 255], [229,245,224, 255]]
	},
	{
		name: 'Greys',
		colorMaker: undefined,
		domain: [0, 1],
		colors: [[99,99,99, 255], [189,189,189, 255], [240,240,240, 255]]
	}
];

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
	constructor(minVal, maxVal, gamma, colorRamp){
		// console.log('new ColorMaker', {minVal, maxVal, gamma, colorRamp});
		this._gamma = gamma;
		this._domain = [minVal, maxVal];
		this._normalize = minVal < 0 && maxVal > 0
			? linearInterpolation([minVal, 0, maxVal], [-1, 0, 1])
			: linearInterpolation(this._domain, [0, 1]);

		const cr = colorRamp === undefined
			? minVal < 0 && maxVal > 0
				// Pick the first color ramp that satisfies the current domain
				? colorRamps.find(cr => cr.domain[0] === -1)
				: colorRamps.find(cr => cr.domain[0] === 0)
			: colorRamp;

		this._colorize = rgbaInterpolation(cr.domain, cr.colors);
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

export class ColorMakerRamps extends ColorMaker {
	constructor(minVal, maxVal, gamma, colorRampName) {
		const filteredColorRamps = minVal < 0 && maxVal > 0
			? colorRamps.filter(cr => cr.domain[0] === -1)
			: colorRamps.filter(cr => cr.domain[0] === 0);
		const colorRampIdx = filteredColorRamps.findIndex(cr => cr.name === colorRampName);
		const selectedColorRamp = filteredColorRamps[colorRampIdx];

		super(minVal, maxVal, gamma, selectedColorRamp);
// console.log('new ColorMakerRamps', colorRampName, selectedColorRamp);
		this.colorRampName = colorRampName;
		this.colorRampIdx = colorRampIdx;
		this.colorRamps = filteredColorRamps.map(cr => ({
			...cr,
			...{colorMaker: new ColorMaker(cr.domain[0], cr.domain.slice(-1)[0], gamma, cr)}
		}));
	}
}
