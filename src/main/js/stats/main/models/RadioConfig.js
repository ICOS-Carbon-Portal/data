const configs = [
	{
		name: "main",
		config: [
			{
				txt: 'Popular Timeserie variables',
				parentTo: "popularTSVars",
				actionTxt: 'getPopularTimeserieVars'
			},
			{
				txt: 'Timeserie',
				actionTxt: 'getPreviewTimeserie'
			},
			{
				txt: 'NetCDF',
				actionTxt: 'getPreviewNetCDF'
			},
			{
				txt: 'Map and Graph (Shipping lines)',
				actionTxt: 'getPreviewMapGraph'
			}
		]
	},
	{
		name: "popularTSVars",
		label: "Select popular variable",
		config: [
			{
				txt: 'Graph Type',
				actionTxt: 'type'
			},
			{
				txt: 'X',
				actionTxt: 'x'
			},
			{
				txt: 'Y',
				actionTxt: 'y'
			}
		]
	}
];

export class RadioConfig{
	constructor(radioConf, action, actionTxt, active = true){
		this.active = active;
		this.radioConf = radioConf;
		this.name = radioConf.name;
		this.label = radioConf.label;
		this.radios = actionTxt === undefined
			? radioConf.config.map((r, i) => Object.assign(r, {isActive: i === 0}))
			: radioConf.config.map(r => Object.assign(r, {isActive: r.actionTxt === actionTxt}));
		this.action = action === undefined
			? () => console.log("Not implemented")
			: action;
	}

	get isActive(){
		return this.active;
	}

	get selected(){
		return this.radios.find(r => r.isActive);
	}

	withSelected(actionTxt){
		return new RadioConfig(this.radioConf, this.action, actionTxt);
	}

	setInactive(){
		return new RadioConfig(this.radioConf, this.action, undefined, false);
	}

	setActive(){
		return new RadioConfig(this.radioConf, this.action, undefined, true);
	}
}

export const getConfig = confName => {
	return configs.find(conf => conf.name === confName);
};
