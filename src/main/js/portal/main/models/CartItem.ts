import {KeyStrVal, UrlStr} from "../backend/declarations";
import commonConfig from '../../../common/main/config';


type DataType = keyof typeof commonConfig.previewTypes;

export interface DataObject {
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
	type: DataType | undefined,
	temporalResolution: string
}

export interface CartItemSerialized {
	id: string
	dataobject: DataObject
	type: DataType | undefined
	url: UrlStr | undefined
	keyValPairs: KeyStrVal
}

export default class CartItem {
	readonly _id: UrlStr;
	readonly _dataobject: DataObject;
	readonly _type: DataType | undefined;
	readonly _url: UrlStr | undefined;
	private readonly _keyValPairs: KeyStrVal;

	constructor(dataobject: DataObject, type?: DataType, url?: string){
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

		return keyValpairs.reduce<KeyStrVal>((acc: KeyStrVal, curr: string) => {
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

	getNewUrl(keyVal: KeyStrVal){
		const newKeyVal = Object.assign(this._keyValPairs, keyVal);
		const matchArr = this._id.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
		const matchedId = matchArr && matchArr.length > 0 ? matchArr[1] : '';
		const host = matchedId.replace('meta', 'data');

		return `https://${host}/dygraph-light/?` + Object.keys(newKeyVal)
			.map(key => `${key}=${newKeyVal[key]}`)
			.join('&');
	}
}
