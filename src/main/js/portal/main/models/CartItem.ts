import {IdxSig, UrlStr} from "../backend/declarations";
import { PreviewType } from "../config";

export interface DataObject {
	dobj: string,
	dataset: string,
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
	type: PreviewType | undefined,
	temporalResolution: string
}

export interface CartItemSerialized {
	id: string
	dataobject: DataObject
	type: PreviewType | undefined
	url: UrlStr | undefined
	keyValPairs: IdxSig
}

export default class CartItem {
	private readonly _id: UrlStr;
	private readonly _dataobject: DataObject;
	private readonly _type: PreviewType | undefined;
	private readonly _url: UrlStr | undefined;
	private readonly _keyValPairs: IdxSig;

	constructor(dataobject: DataObject, type?: PreviewType, url?: string){
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

		return keyValpairs.reduce<IdxSig>((acc, curr) => {
			const p = curr.split('=');
			acc[p[0]] = p[1];
			return acc;
		}, {});
	}

	get hasKeyValPairs(){
		return Object.getOwnPropertyNames(this._keyValPairs).length > 0;
	}

	get dobj() {
		return this._id;
	}

	get level() {
		return this._dataobject.level;
	}

	get temporalResolution() {
		return this._dataobject.temporalResolution;
	}

	get dataset() {
		return this._dataobject.dataset;
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

	get fileName() {
		return this.itemName;
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

	deleteKeyValPair(key: string){
		delete this._keyValPairs[key];
	}

	getValue(key: string){
		return this._keyValPairs[key];
	}

	getNewUrl(keyVal: IdxSig){
		const newKeyVal = Object.assign(this._keyValPairs, keyVal);
		if (newKeyVal.hasOwnProperty('y2') && newKeyVal.hasOwnProperty('legendLabels'))
			Object.assign(newKeyVal, {legendLabelsY2: newKeyVal.legendLabels});
		const matchArr = this._id.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
		const matchedId = matchArr && matchArr.length > 0 ? matchArr[1] : '';
		const host = matchedId.replace('meta', 'data');

		return `https://${host}/dygraph-light/?` + Object.keys(newKeyVal)
			.map(key => `${key}=${newKeyVal[key]}`)
			.join('&');
	}
}
