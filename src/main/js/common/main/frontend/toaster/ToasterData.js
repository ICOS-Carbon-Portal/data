export const TOAST_SUCCESS = 'TOAST_SUCCESS';
export const TOAST_INFO = 'TOAST_INFO';
export const TOAST_WARNING = 'TOAST_WARNING';
export const TOAST_ERROR = 'TOAST_ERROR';

export class ToasterData{
	constructor(type, message){
		//TODO: Use Symbol() for id if/when IE catches up
		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
		this._id = Date.now() + '-' + Math.round(Math.random() * 100000000);
		this._type = type;
		this._message = message;
	}

	get id(){
		return this._id;
	}

	get message(){
		return this._message;
	}

	get header(){
		switch (this._type){
			case TOAST_SUCCESS:
				return "Success";
			case TOAST_INFO:
				return "Information";
			case TOAST_WARNING:
				return "Warning";
			case TOAST_ERROR:
				return "Error";
			default:
				return "Misc";
		}
	}

	get className(){
		switch (this._type){
			case TOAST_SUCCESS:
				return "alert alert-success";
			case TOAST_INFO:
				return "alert alert-info";
			case TOAST_WARNING:
				return "alert alert-warning";
			case TOAST_ERROR:
				return "alert alert-danger";
			default:
				return "alert alert-default";
		}
	}
}