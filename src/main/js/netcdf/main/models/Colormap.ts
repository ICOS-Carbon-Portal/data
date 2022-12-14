import { linearInterpolation, RGBA, rgbaInterpolation } from "icos-cp-spatial";
import { ColorRamp } from "../../../common/main/models/colorRampDefs";

const noValue: RGBA = [255, 255, 255, 0]

export default class Colormap{
	readonly isForDivergingData: boolean
	/**
	 * normalizedValue shall have range [0, 1] for non-divergent and [-1, 0, 1] for divergent data
	*/
	readonly colorize: (normalizedValue: number) => RGBA

	constructor(readonly ramp: ColorRamp, readonly gamma: number){
		this.isForDivergingData = ramp.domain[0] < 0

		const colorizePlainly = rgbaInterpolation(ramp.domain, ramp.colors)

		this.colorize = (normalizedValue: number) => {

			const gammaCorrected = normalizedValue >= 0
				? Math.pow(normalizedValue, gamma)
				: - Math.pow(- normalizedValue, gamma)

			return colorizePlainly(gammaCorrected)
		}
	}

	withGamma(newGamma: number){
		return new Colormap(this.ramp, newGamma)
	}

	getColorMaker(min: number, max: number, treatAsFullRange: boolean = false): (value: number) => RGBA {
		const midPoint = (min <= 0 && max >= 0) ? 0 : (min + max) / 2

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
