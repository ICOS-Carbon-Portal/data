export default class CartItem {
	constructor(dataobject, type, settings){
		this._id = dataobject.dobj;
		this._dataobject = dataobject;
		this._type = type;
		this._settings = settings;
	}

	get id(){
		return this._id;
	}

	get type(){
		return this._type;
	}

	get spec(){
		return this._dataobject.spec;
	}

	get item(){
		return this._dataobject;
	}

	get itemName(){
		function stripExt(fileName){
			return fileName.slice(0, fileName.lastIndexOf('.'));
		}

		return stripExt(this._dataobject.fileName);
	}

	withSetting(setting, value, itemType){
		console.log({itemType, setting, value, settings: this._settings});
		const newSettings = this._settings
			? this._settings.withSetting(setting, value)
			: itemType === 'TIMESERIES'
				? new SettingsDygraph()
				: itemType === 'NETCDF'
					? new SettingsNetCDF()
					: undefined;
		return new CartItem(this._dataobject, newSettings);
	}

	get settings(){
		return this._settings;
	}
}

export class SettingsDygraph {
	constructor(xAxis, yAxis, type){
		this._xAxis = xAxis || undefined;
		this._yAxis = yAxis || undefined;
		this._type = type || 'scatter';
	}

	get xAxis(){
		return this._xAxis;
	}

	get yAxis(){
		return this._yAxis;
	}

	get type(){
		return this._type;
	}

	withSetting(setting, value){
		switch(setting){

			case "xAxis":
				return new SettingsDygraph(value, this._yAxis, this._type);

			case "yAxis":
				return new SettingsDygraph(this._xAxis, value, this._type);

			case "type":
				return new SettingsDygraph(this._xAxis, this._yAxis, value);

			default:
				throw `Unknown setting (${setting}: ${value})`;
		}
	}
}

export class SettingsNetCDF {
	constructor(url){
		this._url = url;
	}

	get url() {
		return this._url;
	}

	withSetting(setting, value){
		switch(setting){

			case "url":
				return new SettingsNetCDF(value);

			default:
				throw `Unknown setting (${setting}: ${value})`;
		}

	}
}
