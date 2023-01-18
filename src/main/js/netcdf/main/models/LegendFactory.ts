import { linearInterpolation, RGBA } from "icos-cp-spatial";
import Colormap from "./Colormap";
import { MinMax } from "./State";

export interface Legend{
	valueMaker: (x: number) => number
	pixelMaker: (x: number) => number
	domain: number[]
	colorMaker: (pixel: number) => RGBA
	suggestedTickLocations: number[]
}

export default function legendFactory(mm: MinMax, cm: Colormap): (pixelMin: number, pixelMax: number) => Legend {
	const colorMaker = cm.getColorMaker(mm.min, mm.max)

	const isDiverging = cm.isForDivergingData && mm.min < 0 && mm.max > 0

	const valdomain = isDiverging ? [mm.min, 0, mm.max] : [mm.min, mm.max]
	const normdomain = isDiverging ? [-1, 0, 1] : [0, 1]

	const valToNorm = linearInterpolation(valdomain, normdomain)
	const valToNormGamma = cm.gamma === 1 ? valToNorm : (v: number) => {
		const norm = valToNorm(v)
		return norm >= 0 ? Math.pow(norm, cm.gamma) : - Math.pow( - norm, cm.gamma)
	}
	const gammaPixNormToVal = linearInterpolation(normdomain, valdomain)
	const pixNormToVal = cm.gamma === 1 ? gammaPixNormToVal : (pixNorm: number) => {
		const gammaPixNorm = pixNorm > 0 ? Math.pow(pixNorm, 1 / cm.gamma) : - Math.pow(- pixNorm, 1 / cm.gamma)
		return gammaPixNormToVal(gammaPixNorm)
	}

	return (pixelMin, pixelMax) => {
		const pixelDomain = isDiverging ? [pixelMin, (pixelMin + pixelMax)/2, pixelMax]: [pixelMin, pixelMax]
		const normToPixel = linearInterpolation(normdomain, pixelDomain)
		const pixelToNorm = linearInterpolation(pixelDomain, normdomain)
		const valueMaker = (pixel: number) => pixNormToVal(pixelToNorm(pixel))

		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 80)
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax])

		return {
			valueMaker,
			pixelMaker: (v: number) => normToPixel(valToNormGamma(v)),
			domain: [mm.min, mm.max],
			colorMaker: (pixel: number) => colorMaker(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		}
	}
}
