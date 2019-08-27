import {EDataType} from '../typescript/enums';
import {IKeyValStrPairs} from "../typescript/interfaces";

interface IDataObject {
	dobj: string,
	fileName: string,
	format: string,
	formatLabel: string,
	level: number,
	size: string,
	spec: string,
	specLabel: string,
	submTime: string,
	theme: string,
	themeLabel: string,
	timeEnd: string,
	timeStart: string,
	type: EDataType | undefined
}

export default class CartItem {
	readonly _id: string;
	readonly _dataobject: IDataObject;
	readonly _type: EDataType | undefined;
	readonly _url: string | undefined;
	private readonly _keyValPairs: IKeyValStrPairs;

	constructor(dataobject: IDataObject, type: EDataType | undefined, url: string | undefined = undefined){
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

	deconstructURL(url: string | undefined) {
		if (url === undefined) return {};

		const search = url.split('?').pop() || '';
		const searchStr = search.replace(/^\?/, '');
		const keyValpairs = searchStr.split('&');

		return keyValpairs.reduce<IKeyValStrPairs>((acc: IKeyValStrPairs, curr: string) => {
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
		return parseInt(this._dataobject.size || '0');
	}

	get item(){
		return this._dataobject;
	}

	get itemName(){
		function stripExt(fileName: string){
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

	getUrlSearchValue(key: string) {
		return this._keyValPairs[key];
	}

	withUrl(url: string){
		return new CartItem(this._dataobject, this._type, url);
	}

	getNewUrl(keyVal: IKeyValStrPairs){
		const newKeyVal = Object.assign(this._keyValPairs, keyVal);
		const matchArr = this._id.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
		const matchedId = matchArr && matchArr.length > 0 ? matchArr[1] : '';
		const host = matchedId.replace('meta', 'data');

		return `https://${host}/dygraph-light/?` + Object.keys(newKeyVal)
			.map(key => `${key}=${newKeyVal[key]}`)
			.join('&');
	}
}
