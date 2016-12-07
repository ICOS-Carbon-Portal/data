
export class Control{
	constructor(values, selectedIdx){
		this.values = values;
		this.selectedIdx = selectedIdx || 0;
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

const defaultControl = new Control([], -1);
const defaultGammas = new Control([0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0], 0);
const defaultDelays = new Control([0, 50, 100, 200, 500, 1000, 3000], 3);

export class ControlsHelper{
	constructor(services, variables, dates, elevations, gammas, delays, lastSelectedCtrl){
		this.services = services || defaultControl;
		this.variables = variables || defaultControl;
		this.dates = dates || defaultControl;
		this.elevations = elevations || defaultControl;
		this.gammas = gammas || defaultGammas;
		this.delays = delays || defaultDelays;

		this.lastChangedControl = lastSelectedCtrl;
	}

	get allControlsLoaded(){
		return this.services.isLoaded
			&& this.variables.isLoaded
			&& this.dates.isLoaded
			&& this.elevations.isLoaded;
	}

	get selectedIdxs(){
		return {
			dateIdx: this.dates.selectedIdx,
			elevationIdx: this.elevations.selectedIdx,
			gammaIdx: this.gammas.selectedIdx,
			serviceIdx: this.services.selectedIdx,
			variableIdx: this.variables.selectedIdx
		};
	}

	withServices(services, lastSelectedCtrl){
		return new ControlsHelper(services, defaultControl, defaultControl, defaultControl, this.gammas, this.delays, lastSelectedCtrl);
	}

	withVariables(variables, lastSelectedCtrl){
		return new ControlsHelper(this.services, variables, this.dates, defaultControl, this.gammas, this.delays, lastSelectedCtrl);
	}

	withDates(dates, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, dates, this.elevations, this.gammas, this.delays, lastSelectedCtrl);
	}

	withElevations(elevations, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, this.dates, elevations, this.gammas, this.delays, lastSelectedCtrl);
	}

	withGammas(gammas, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, gammas, this.delays, lastSelectedCtrl);
	}

	withDelays(delays, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, this.gammas, delays, lastSelectedCtrl);
	}

	withSelectedService(idx){
		return this.withServices(this.services.withSelected(idx), 'services');
	}

	withSelectedVariable(idx){
		return this.withVariables(this.variables.withSelected(idx), 'variables');
	}

	withSelectedDate(idx){
		return this.withDates(this.dates.withSelected(idx), 'dates');
	}

	withIncrementedDate(increment){
		const suggestedIdx = this.dates.selectedIdx + increment;
		const newIdx = suggestedIdx >= 0 && suggestedIdx < this.dates.values.length
			? this.dates.selectedIdx + increment
			: 0;

		return this.withDates(this.dates.withSelected(newIdx), 'dates');
	}

	withSelectedElevation(idx){
		return this.withElevations(this.elevations.withSelected(idx), 'elevations');
	}

	withSelectedGamma(idx){
		return this.withGammas(this.gammas.withSelected(idx), 'gammas');
	}

	withSelectedDelay(idx){
		return this.withDelays(this.delays.withSelected(idx), 'delays');
	}
}