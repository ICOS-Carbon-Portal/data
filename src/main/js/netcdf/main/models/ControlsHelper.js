import {colorRamps} from "../../../common/main/models/ColorMaker";

export class Control{
	constructor(values, selectedIdx){
		this.values = values;
		this.selectedIdx = selectedIdx > 0 ? selectedIdx : 0;
	}

	get isLoaded(){
		return !!this.values;
	}

	get hasSelected(){
		return this.isLoaded && this.selectedIdx >= 0 && this.selectedIdx < this.values.length;
	}

	get selected(){
		return this.hasSelected ? this.values[this.selectedIdx] : null;
	}

	withSelected(selectedIdx){
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
const defaultGammas = new Control([0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0], 0);
const defaultDelays = new Control([0, 50, 100, 200, 500, 1000, 3000], 3);
const defaultColorRamps = new ControlColorRamp(colorRamps);

export class ControlsHelper{
	constructor(services, variables, dates, elevations, gammas, delays, colorRamps){
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