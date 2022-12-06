import {colorRamps} from "../../../common/main/models/ColorMaker";

export class Control{
	public readonly values: string[]
	public readonly selectedIdx: number | null
	constructor(values: string[], selectedIdx: number | null){
		this.values = values;
		this.selectedIdx = selectedIdx
	}

	get isLoaded(): boolean{
		return this.values.length > 0;
	}

	get hasSelected(): boolean{
		return this.isLoaded && this.selectedIdx != null
	}

	get selected(): string | null {
		return this.selectedIdx === null ? null : this.values[this.selectedIdx]
	}

	withSelected(selectedIdx: number){
		return new Control(this.values, selectedIdx);
	}
}

export class ControlColorRamp extends Control {
	constructor(colorRamps, selectedIdx) {
		super(colorRamps.map(cr => cr.name), selectedIdx);

		this.colorRamps = colorRamps;
	}

	withSelected(selectedIdx){
		return new ControlColorRamp(this.colorRamps, selectedIdx);
	}
}

const defaultControl = new Control([], -1);
const defaultGammas = new Control([0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0], 4);
const defaultDelays = new Control([0, 50, 100, 200, 500, 1000, 3000], 3);
const defaultColorRamps = new ControlColorRamp(colorRamps);

export class ControlsHelper{
	public readonly services: Control
	public readonly variables: Control
	public readonly dates: Control
	public readonly elevations: Control
	public readonly gammas: Control
	public readonly delays: Control
	public readonly colorRamps: Control
	constructor(services: Control, variables: Control, dates: Control, elevations: Control, gammas: Control, delays: Control, colorRamps: Control){
		this.services = services || defaultControl;
		this.variables = variables || defaultControl;
		this.dates = dates || defaultControl;
		this.elevations = elevations || defaultControl;
		this.gammas = gammas || defaultGammas;
		this.delays = delays || defaultDelays;
		this.colorRamps = colorRamps || defaultColorRamps;
	}

	get allControlsLoaded(){
		return this.services.isLoaded
			&& this.variables.isLoaded
			&& this.dates.isLoaded
			&& this.elevations.isLoaded
			&& this.colorRamps.isLoaded;
	}

	get selectedIdxs(){
		return {
			dateIdx: this.dates.selectedIdx,
			elevationIdx: this.elevations.selectedIdx,
			gammaIdx: this.gammas.selectedIdx,
			serviceIdx: this.services.selectedIdx,
			variableIdx: this.variables.selectedIdx,
			colorRampIdx: this.colorRamps.selectedIdx,
		};
	}

	withServices(services){
		return new ControlsHelper(services, defaultControl, defaultControl, defaultControl, this.gammas, this.delays, this.colorRamps);
	}

	withVariables(variables){
		return new ControlsHelper(this.services, variables, this.dates, defaultControl, this.gammas, this.delays, this.colorRamps);
	}

	withDates(dates){
		return new ControlsHelper(this.services, this.variables, dates, this.elevations, this.gammas, this.delays, this.colorRamps);
	}

	withElevations(elevations){
		return new ControlsHelper(this.services, this.variables, this.dates, elevations, this.gammas, this.delays, this.colorRamps);
	}

	withGammas(gammas){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, gammas, this.delays, this.colorRamps);
	}

	withDelays(delays){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, this.gammas, delays, this.colorRamps);
	}

	withColorRamps(colorRamps){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, this.gammas, this.delays, colorRamps);
	}

	withSelectedService(idx){
		return this.withServices(this.services.withSelected(idx));
	}

	withSelectedVariable(idx){
		return this.withVariables(this.variables.withSelected(idx));
	}

	withSelectedDate(idx){
		return this.withDates(this.dates.withSelected(idx));
	}

	withIncrementedDate(increment){
		const suggestedIdx = this.dates.selectedIdx + increment;
		const newIdx = suggestedIdx >= 0 && suggestedIdx < this.dates.values.length
			? this.dates.selectedIdx + increment
			: 0;

		return this.withDates(this.dates.withSelected(newIdx));
	}

	withSelectedElevation(idx){
		return this.withElevations(this.elevations.withSelected(idx));
	}

	withSelectedGamma(idx){
		return this.withGammas(this.gammas.withSelected(idx));
	}

	withSelectedDelay(idx){
		return this.withDelays(this.delays.withSelected(idx));
	}

	withSelectedColorRamp(idx){
		return this.withColorRamps(this.colorRamps.withSelected(idx));
	}
}