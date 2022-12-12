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
	const domain = [mm.min, mm.max]
	const colorMaker = cm.getColorMaker(mm.min, mm.max)

	return (pixelMin, pixelMax) => {
		const valueMaker = linearInterpolation([pixelMin, pixelMax], domain)
		const pixelMaker = linearInterpolation(domain, [pixelMin, pixelMax])
		const nTickIntervals = Math.floor((pixelMax - pixelMin) / 80)
		const toPixel = linearInterpolation([0, nTickIntervals], [pixelMin, pixelMax])

		return {
			valueMaker,
			pixelMaker,
			domain,
			colorMaker: (pixel: number) => colorMaker(valueMaker(pixel)),
			suggestedTickLocations: Array.from({length: nTickIntervals + 1}, (_, i) => i).map(toPixel)
		}
	}
}
