export default class CollectionItem {
	constructor(objInfo){
		this._id = objInfo.dobj;
		this._objInfo = objInfo;
	}

	get id(){
		return this._id;
	}
}