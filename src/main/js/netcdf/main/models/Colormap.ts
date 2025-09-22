import { linearInterpolation, RGBA, rgbaInterpolation } from "icos-cp-spatial";
import { colorRamps } from "../../../common/main/models/colorRampDefs";
import { MinMax } from "./State";
import { Control, getSelectedControl } from "./ControlsHelper";

const noValue: RGBA = [255, 255, 255, 0]
export const defaultGamma = 1;
export type Colormap = {
	name: string
	isForDivergingData: boolean
	gamma: number
};

export function colormapColorize(colormap: Colormap): (normalizedValue: number) => RGBA {
	if (colormap.gamma === 1) {
		return colorizePlainly(colormap);
	}
	return (normalizedValue: number) => {
		const gammaCorrected = normalizedValue >= 0
			? Math.pow(normalizedValue, colormap.gamma)
			: - Math.pow(- normalizedValue, colormap.gamma);

		return colorizePlainly(colormap)(gammaCorrected);
	};
}

function colorizePlainly(colormap: Colormap): (normalizedValue: number) => RGBA {
	switch (colormap.name) {
		case "rainbow":
			return rainbowColorize;
		case "rainbow_turbo":
			return rainbowTurboColorize;
		default:
			const ramp = colorRamps.find((cr) => (cr.name === colormap.name))!;
			return rgbaInterpolation(ramp.domain, ramp.colors);
	}
}

export const allColormaps: Colormap[] = [
	{name: "rainbow", isForDivergingData: false, gamma: defaultGamma},
	{name: "rainbow_turbo", isForDivergingData: false, gamma: defaultGamma},
	...(colorRamps.map((cr) => { return {name: cr.name, isForDivergingData: false, gamma: defaultGamma}}))
];

function rainbowColorize(normValue: number): RGBA {
	let redFactor = Math.abs(normValue * 2 - 0.5);
	if (redFactor > 1) {
		redFactor = 1;
	}
	const red = 255 * redFactor;
	const green = 255 * Math.sin(normValue * Math.PI);
	const blue = 255 * Math.cos(normValue * Math.PI / 2);
	return [red, green, blue, 255];
}

function rainbowTurboColorize(normValue: number): RGBA{
	const v = normValue * 1.4 - 0.2; // 40% stretch
	if (v >= 0 && v <= 1) {
		return rainbowColorize(v);
	}
	let rbow = v < 0 ? rainbowColorize(0) : rainbowColorize(1);
	const distFromEnd = v < 0 ? -v : v - 1;
	const factor = 1 - 4 * distFromEnd;
	for (let i = 0; i < 3; i++) {
		rbow[i] = factor * rbow[i];
	}
	return rbow;
}

export function colormapColorMaker(colormap: Colormap, min: number, max: number, treatAsFullRange: boolean = false): (value: number) => RGBA {
	const midPoint = (min < 0 && max > 0) ? 0 : (min + max) / 2;

	let normalizer = linearInterpolation([min, max], [0, 1]);
	if (colormap.isForDivergingData) {
		if (treatAsFullRange) {
			normalizer = linearInterpolation([min, midPoint, max], [-1, 0, 1]);
		} else if(!treatAsFullRange) {
			if (max <= 0) {
				normalizer = linearInterpolation([min, max], [-1, 0]);
			} else if (min < 0) {
				normalizer = linearInterpolation([min, 0, max], [-1, 0, 1]);
			}
		}
	}

	return (v: number) => {
		if (isNaN(v)) {
			return noValue;
		}
		return colormapColorize(colormap)(normalizer(v));
	}
}

export function getColormapSelectColorMaker(colormap: Colormap, minPixel: number, maxPixel: number): (value: number) => RGBA{
	return colormapColorMaker({...colormap, gamma: 1}, minPixel, maxPixel, true);
}

export function getColorMaker(minMax: MinMax | undefined, control: Control<Colormap>): ((v: number) => RGBA) | undefined {
	const selectedColorMap = getSelectedControl(control);
	if (minMax === undefined || selectedColorMap === null) {
		return undefined;
	}
	return colormapColorMaker(selectedColorMap, minMax.min, minMax.max);
}
