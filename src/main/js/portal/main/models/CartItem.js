export default class CartItem {
	constructor(dataobject, type, url, settings){
		this._id = dataobject.dobj;
		this._dataobject = dataobject;
		this._type = type;
		this._url = url;
		// this._keyValpairs = this.deconstructURL(url);
		this._settings = settings;
	}

	// deconstructURL(url) {
	// 	if (!url) return undefined;
	//
	// 	const search = url.split('?').pop();
	//
	// 	if (window.URLSearchParams) {
	// 		return new URLSearchParams(search);
	// 	} else {
	// 		const searchStr = search.replace(/^\?/, '');
	// 		const keyValpairs = searchStr.split('&');
	//
	// 		return keyValpairs.reduce((acc, curr) => {
	// 			const p = curr.split('=');
	// 			acc[p[0]] = p[1];
	// 			return acc;
	// 		}, {});
	// 	}
	// }

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

	get url(){
		return this._url;
	}

	// getUrlSearchValue(key) {
	// 	return this._keyValpairs[key];
	// }

	withUrl(url){
		return new CartItem(this._dataobject, this._type, url, this._settings);
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
