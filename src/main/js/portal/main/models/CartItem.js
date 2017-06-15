export default class CartItem {
	constructor(dataobject){
		this._id = dataobject.dobj;
		this._dataobject = dataobject;
		this._settings = undefined;
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
}