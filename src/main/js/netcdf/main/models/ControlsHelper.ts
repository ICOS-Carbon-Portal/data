import { getRasterId, RasterRequest } from "../backend";
import Colormap, { colorMaps } from "./Colormap";

export class Control<T>{

	constructor(
		readonly values: T[],
		readonly selectedIdx: number | null = null
	){}

	get selected(): T | null {
		return (this.selectedIdx === null || this.selectedIdx < 0 || this.selectedIdx >= this.values.length)
			? null
			: this.values[this.selectedIdx]
	}

	withSelected(selectedIdx: number){
		return new Control(this.values, selectedIdx);
	}
}

export class ColormapControl extends Control<Colormap> {
	constructor(colorMaps: Colormap[], selectedIdx: number | null = null) {
		super(colorMaps, selectedIdx)
	}

	withGamma(newGamma: number){
		return new ColormapControl(this.values.map(cm => cm.withGamma(newGamma)), this.selectedIdx)
	}

	withSelected(selectedIdx: number): ColormapControl {
		return new ColormapControl(this.values, selectedIdx)
	}
}

const defaultControl = new Control([]);
export const defaultGammas = new Control([0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0], 4);
const selectedGamma = defaultGammas.selected! //we selected one in the previous line
const defaultColorMaps = new ColormapControl(colorMaps.map(cm => cm.withGamma(selectedGamma)), 0)
const defaultDelays = new Control([0, 50, 100, 200, 500, 1000, 3000], 3);

export class ControlsHelper{
	readonly services: Control<string> = defaultControl
	readonly variables: Control<string> = defaultControl
	readonly dates: Control<string> = defaultControl
	readonly elevations: Control<number> = defaultControl
	readonly gammas: Control<number> = defaultGammas
	readonly delays: Control<number> = defaultDelays
	readonly colorMaps: ColormapControl = defaultColorMaps

	get rasterRequest(): RasterRequest | undefined {
		const service = this.services.selected
		const variable = this.variables.selected
		const dateIdx = this.dates.selectedIdx
		const elevationIdx = this.elevations.selectedIdx

		return (
			service === null || variable === null || dateIdx === null || dateIdx < 0 || elevationIdx === null
		) ? undefined : {service, variable, dateIdx, elevationIdx}
	}

	get rasterId(): string | undefined {
		const req = this.rasterRequest
		return req ? getRasterId(req) : undefined
	}

	copyWith(update: {[K in keyof ControlsHelper]?: ControlsHelper[K]}): ControlsHelper{
		return Object.assign(Object.create(ControlsHelper.prototype), this, update)
	}

	withSelectedService(idx: number){
		return this.copyWith({services: this.services.withSelected(idx)})
	}

	withSelectedVariable(idx: number){
		return this.copyWith({variables: this.variables.withSelected(idx)})
	}

	withSelectedDate(idx: number){
		return this.copyWith({dates: this.dates.withSelected(idx)})
	}

	withIncrementedDate(increment: number){
		const suggestedIdx = (this.dates.selectedIdx ?? 0) + increment;
		const newIdx = suggestedIdx >= 0 && suggestedIdx < this.dates.values.length
			? suggestedIdx
			: 0;

		return this.copyWith({dates: this.dates.withSelected(newIdx)})
	}

	withSelectedElevation(idx: number){
		return this.copyWith({elevations: this.elevations.withSelected(idx)})
	}

	withSelectedGamma(idx: number){
		return this.copyWith({gammas: this.gammas.withSelected(idx)})
	}

	withSelectedDelay(idx: number){
		return this.copyWith({delays: this.delays.withSelected(idx)})
	}

	withSelectedColorRamp(idx: number){
		return this.copyWith({colorMaps: this.colorMaps.withSelected(idx)})
	}
}
