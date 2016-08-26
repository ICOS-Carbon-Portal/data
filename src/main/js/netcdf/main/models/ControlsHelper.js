
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

const defaultControl = new Control(null, -1);
const defaultGammas = new Control([0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0], 0);

export class ControlsHelper{
	constructor(services, variables, dates, elevations, gammas, lastSelectedCtrl){
		this.services = services || defaultControl;
		this.variables = variables || defaultControl;
		this.dates = dates || defaultControl;
		this.elevations = elevations || defaultControl;
		this.gammas = gammas || defaultGammas;

		this.lastChangedControl = lastSelectedCtrl;
	}

	get allControlsLoaded(){
		return this.services.isLoaded
			&& this.variables.isLoaded
			&& this.dates.isLoaded
			&& this.elevations.isLoaded;
	}

	withServices(services, lastSelectedCtrl){
		return new ControlsHelper(services, defaultControl, defaultControl, defaultControl, this.gammas, lastSelectedCtrl);
	}

	withVariables(variables, lastSelectedCtrl){
		return new ControlsHelper(this.services, variables, this.dates, defaultControl, this.gammas, lastSelectedCtrl);
	}

	withDates(dates, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, dates, this.elevations, this.gammas, lastSelectedCtrl);
	}

	withElevations(elevations, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, this.dates, elevations, this.gammas, lastSelectedCtrl);
	}

	withGammas(gammas, lastSelectedCtrl){
		return new ControlsHelper(this.services, this.variables, this.dates, this.elevations, gammas, lastSelectedCtrl);
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

	withSelectedElevation(idx){
		return this.withElevations(this.elevations.withSelected(idx), 'elevations');
	}

	withSelectedGamma(idx){
		return this.withGammas(this.gammas.withSelected(idx), 'gammas');
	}
}