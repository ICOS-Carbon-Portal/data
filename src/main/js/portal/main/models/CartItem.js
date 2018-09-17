export default class CartItem {
	constructor(dataobject, type, url){
		this._id = dataobject.dobj;
		this._dataobject = dataobject;
		this._type = type;
		this._url = url;
		this._keyValPairs = this.deconstructURL(url);
	}

	get serialize(){
		return {
			id: this._id,
			dataobject: this._dataobject,
			type: this._type,
			url: this._url,
			keyValPairs: this._keyValPairs
		};
	}

	deconstructURL(url) {
		if (!url) return {};

		const search = url.split('?').pop();
		const searchStr = search.replace(/^\?/, '');
		const keyValpairs = searchStr.split('&');

		return keyValpairs.reduce((acc, curr) => {
			const p = curr.split('=');
			acc[p[0]] = p[1];
			return acc;
		}, {});
	}

	get hasKeyValPairs(){
		return Object.getOwnPropertyNames(this._keyValPairs).length > 0;
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

	get size(){
		return parseInt(this._dataobject.size || 0);
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

	get specLabel() {
		return this._dataobject.specLabel;
	}

	get timeStart() {
		return new Date(this._dataobject.timeStart);
	}

	get timeEnd() {
		return new Date(this._dataobject.timeEnd);
	}

	getUrlSearchValue(key) {
		return this._keyValPairs[key];
	}

	withUrl(url){
		return new CartItem(this._dataobject, this._type, url);
	}

	getNewUrl(keyVal){
		const newKeyVal = Object.assign(this._keyValPairs, keyVal);
		const host = this._id.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1].replace('meta', 'data');

		return `//${host}/dygraph-light/?` + Object.keys(newKeyVal)
			.map(key => `${key}=${newKeyVal[key]}`)
			.join('&');
	}
}
