const configs = [
	{
		name: "mainPreview",
		config: [
			{
				envri: ['ICOS', 'SITES'],
				txt: 'Popular Timeserie variables',
				parentTo: "popularTSVars",
				actionTxt: 'getPopularTimeserieVars'
			},
			{
				envri: ['ICOS', 'SITES'],
				txt: 'Timeserie',
				actionTxt: 'getPreviewTimeserie'
			},
			{
				envri: ['ICOS'],
				txt: 'NetCDF',
				actionTxt: 'getPreviewNetCDF'
			},
			{
				envri: ['ICOS'],
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
				envri: ['ICOS', 'SITES'],
				txt: 'Graph Type',
				actionTxt: 'type'
			},
			{
				envri: ['ICOS', 'SITES'],
				txt: 'X',
				actionTxt: 'x'
			},
			{
				envri: ['ICOS', 'SITES'],
				txt: 'Y',
				actionTxt: 'y'
			}
		]
	},
	{
		name: "mainLib",
		config: [
			{
				envri: ['ICOS'],
				txt: 'Downloads by country',
				actionTxt: 'getLibDownloadsByCountry'
			},
			{
				envri: ['ICOS'],
				txt: 'Downloads by data object',
				actionTxt: 'getLibDownloadsByDobj'
			},
			{
				envri: ['ICOS'],
				txt: 'Downloads by pylib version',
				actionTxt: 'getLibDownloadsByVersion'
			}
		]
	}
];

export const emptyRadioConf = {
	name: "empty",
	config: []
};

export class Radio{
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

	get actionTxt() {
		return this.selected?.actionTxt;
	}

	withSelected(actionTxt){
		return new Radio(this.radioConf, this.action, actionTxt);
	}

	setInactive() {
		return new Radio(this.radioConf, this.action, undefined, false);
	}

	setActive() {
		return new Radio(this.radioConf, this.action, undefined, true);
	}
}

export const getConfig = confName => {
	return configs.find(conf => conf.name === confName);
};
