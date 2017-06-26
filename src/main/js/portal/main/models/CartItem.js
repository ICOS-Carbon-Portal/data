export default class CartItem {
	constructor(dataobject, settings){
		this._id = dataobject.dobj;
		this._dataobject = dataobject;
		this._settings = settings || new Settings();
	}

	get id(){
		return this._id;
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

	withSetting(setting, value){
		return new CartItem(this._dataobject, this._settings.withSetting(setting, value));
	}

	get settings(){
		return this._settings;
	}
}

export class Settings {
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
				return new Settings(value, this._yAxis, this._type);

			case "yAxis":
				return new Settings(this._xAxis, value, this._type);

			case "type":
				return new Settings(this._xAxis, this._yAxis, value);

			default:
				throw `Unknown setting (${setting}: ${value})`;
		}
	}
}