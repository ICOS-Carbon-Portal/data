import { linearInterpolation, RGBA, rgbaInterpolation } from "icos-cp-spatial";
import { ColorRamp, colorRamps } from "../../../common/main/models/colorRampDefs";

const noValue: RGBA = [255, 255, 255, 0]

export default class Colormap{
	/**
	 * normalizedValue shall have range [0, 1] for non-divergent and [-1, 0, 1] for divergent data
	*/
	readonly colorize: (normalizedValue: number) => RGBA

	constructor(
		readonly name: String,
		readonly colorizePlainly: (normalizedValue: number) => RGBA,
		readonly isForDivergingData: boolean,
		readonly gamma: number = 1
	){
		this.colorize = gamma == 1
			? colorizePlainly
			: (normalizedValue: number) => {

				const gammaCorrected = normalizedValue >= 0
					? Math.pow(normalizedValue, gamma)
					: - Math.pow(- normalizedValue, gamma)

				return colorizePlainly(gammaCorrected)
			}
	}

	withGamma(newGamma: number): Colormap{
		return newGamma == this.gamma
			? this
			: new Colormap(this.name, this.colorizePlainly, this.isForDivergingData, newGamma)
	}

	getColorMaker(min: number, max: number, treatAsFullRange: boolean = false): (value: number) => RGBA {
		const midPoint = (min < 0 && max > 0) ? 0 : (min + max) / 2

		const normalizer = treatAsFullRange
			? this.isForDivergingData
				? linearInterpolation([min, midPoint, max], [-1, 0, 1])
				: linearInterpolation([min, max], [0, 1])
			: this.isForDivergingData
				? max <= 0
					? linearInterpolation([min, max], [-1, 0])
					: min >= 0
						? linearInterpolation([min, max], [0, 1])
						: linearInterpolation([min, 0, max], [-1, 0, 1])
				: linearInterpolation([min, max], [0, 1])

		const colorizer = this.colorize

		return (v: number) => {
			if (isNaN(v)) return noValue
			return colorizer(normalizer(v))
		}
	}

	getColormapSelectColorMaker(minPixel: number, maxPixel: number): (value: number) => RGBA{
		return this.getColorMaker(minPixel, maxPixel, true)
	}
}

function rainbowColorize(normValue: number): RGBA {
	let redFactor = Math.abs(normValue * 2 - 0.5)
	if(redFactor > 1) redFactor = 1
	const red = 255 * redFactor
	const green = 255 * Math.sin(normValue * Math.PI)
	const blue = 255 * Math.cos(normValue * Math.PI / 2)
	return [red, green, blue, 255]
}

function rainbowTurboColorize(normValue: number): RGBA{
	let rbow = rainbowColorize(normValue)
	const distFromEnd = Math.min(normValue, 1 - normValue)
	if (distFromEnd < 0.15) {
		const factor = 0.25 + 5 * distFromEnd
		for(let i = 0; i < 3; i++) {
			rbow[i] = factor * rbow[i]
		}
	}
	return rbow
}

function fromRamp(ramp: ColorRamp){
	const colorizePlainly = rgbaInterpolation(ramp.domain, ramp.colors)
	const isForDivergingData = ramp.domain[0] < 0
	return new Colormap(ramp.name, colorizePlainly, isForDivergingData)
}

export const colorMaps = [
	new Colormap("rainbow", rainbowColorize, false),
	new Colormap("rainbow_turbo", rainbowTurboColorize, false)
].concat(
	colorRamps.map(fromRamp)
)
