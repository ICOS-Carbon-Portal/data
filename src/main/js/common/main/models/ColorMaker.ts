import {rgbaInterpolation, linearInterpolation, RGBA} from 'icos-cp-spatial';
import { ColorRamp, colorRampDefs} from './colorRampDefs';

const noValue: RGBA = [255, 255, 255, 0];

export const colorRamps: ColorRamp[] = colorRampDefs.flatMap(cr => [
	cr,
	{
		name: cr.name + '-rev',
		domain: cr.domain,
		colors: cr.colors.slice().reverse()
	}
])

export function updateElement<T>(elementCreator: () => T): (cr: ColorRamp) => ColorRamp & {element: T} {
	return (cr: ColorRamp) => Object.assign({}, cr, {element: elementCreator()})
}

export default class ColorMaker{
	private readonly _gamma: number
	private readonly _domain: [number, number]
	private readonly _normalize: (x: number) => number
	private readonly _colorize: (x: number) => RGBA

	constructor(minVal: number, maxVal: number, gamma: number, colorRamp: ColorRamp | undefined, isDivergingData: boolean) {
		this._gamma = gamma;
		this._domain = [minVal, maxVal];
		this._normalize = minVal < 0 && maxVal > 0
			? linearInterpolation([minVal, 0, maxVal], [-1, 0, 1])
			: linearInterpolation(this._domain, [0, 1]);
		const cr: ColorRamp = colorRamp === undefined
			? minVal < 0 && maxVal > 0
				// Pick the first color ramp that satisfies the current domain
				? colorRamps.find(cr => cr.domain.length === 3)! // we know we have some
				: colorRamps.find(cr => cr.domain.length === 2)! // we know we have some
			: colorRamp;

		this._colorize = this.getColorizer(minVal, maxVal, isDivergingData, cr);
	}

	getColorizer(minVal: number, maxVal: number, isDivergingData: boolean, colorRamp: ColorRamp) {
		const isDivergingRange = minVal < 0 && maxVal > 0;

		if (!isDivergingRange && isDivergingData && colorRamp.colors.length === 3) {
			return minVal >= 0
				? rgbaInterpolation([0, 1], colorRamp.colors.slice(1))
				: rgbaInterpolation([0, 1], colorRamp.colors.slice(0, 2));
		}
		
		return rgbaInterpolation(colorRamp.domain, colorRamp.colors);;
	}

	makeColor(value: number){
		if (isNaN(value)) return noValue;
		
		const normalized = this._normalize(value);
		const corrected = normalized >= 0
			? Math.pow(normalized, this._gamma)
			: - Math.pow(- normalized, this._gamma);
		return this._colorize(corrected);
	}

	getLegend(pixelMin: number, pixelMax: number) {
		const valueMaker = linearInterpolation([pixelMin, pixelMax], this._domain);
		const pixelMaker = linearInterpolation(this._domain, [pixelMin, pixelMax]);
		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 80);
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax]);

		return {
			valueMaker,
			pixelMaker,
			domain: this._domain,
			colorMaker: (pixel: number) => this.makeColor(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		};
	}
}

export class ColorMakerRamps extends ColorMaker {
	public readonly colorRampIdx: number
	public readonly colorRamps: Array<ColorRamp & {colorMaker: ColorMaker}>

	constructor(minVal: number, maxVal: number, gamma: number, readonly colorRampName: string, isDivergingData: boolean) {
		const filteredColorRamps = findColorRamps(minVal, maxVal, isDivergingData, colorRampName);
		const colorRampIdx = filteredColorRamps.findIndex(cr => cr.name === colorRampName);
		const selectedColorRamp = filteredColorRamps[colorRampIdx];

		super(minVal, maxVal, gamma, selectedColorRamp, isDivergingData);

		this.colorRampIdx = colorRampIdx;
		this.colorRamps = filteredColorRamps.map(cr =>
			Object.assign({}, cr, {
				colorMaker: new ColorMaker(cr.domain[0], cr.domain.slice(-1)[0], gamma, cr, isDivergingData)
			})
		)
	}
}

function findColorRamps(minVal: number, maxVal: number, isDivergingData: boolean, colorRampName: string): ColorRamp[] {

	let filteredColorRamps: ColorRamp[] = isDivergingData
		? colorRamps.filter(cr => cr.domain.length === 3)
		: colorRamps.filter(cr => cr.domain.length === 2)

	const isDivergingRange = minVal < 0 && maxVal > 0

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
}
