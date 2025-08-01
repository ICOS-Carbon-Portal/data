import {IdxSig, UrlStr} from "../backend/declarations";
import { PreviewType, themeUris } from "../config";
import { KnownDataObject} from "./State";

export interface CartItemSerialized {
	id: string
	dataobject: KnownDataObject | undefined
	type: PreviewType | undefined
	url: UrlStr | undefined
	keyValPairs: IdxSig
}

export default class CartItem {
	private readonly _id: UrlStr;
	private readonly _dataobject: KnownDataObject | undefined;
	private readonly _type: PreviewType | undefined;
	private readonly _url: UrlStr | undefined;
	private readonly _keyValPairs: IdxSig;

	constructor(id: string, dataobject?: KnownDataObject, type?: PreviewType, url?: string){
		this._id = id;
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

	deconstructURL(url?: string) {
		if (url === undefined) return {};

		const webUrl = new URL(url);

		const searchParams = Object.fromEntries(webUrl.searchParams);
		if (Object.keys(searchParams).length !== 0) {
			return searchParams;
		}

		if (webUrl.hash) {
			return JSON.parse(decodeURIComponent(webUrl.hash));
		}

		return {};
	}

	get hasKeyValPairs(){
		return Object.getOwnPropertyNames(this._keyValPairs).length > 0;
	}

	get dobj() {
		return this._id;
	}

	get knownDataObject() {
		return this._dataobject;
	}

	get hasNextVersion() {
		return this._dataobject?.hasNextVersion ?? false;
	}

	get level() {
		return this._dataobject?.level ?? 0;
	}

	get temporalResolution() {
		return this._dataobject?.temporalResolution;
	}

	get dataset() {
		return this._dataobject?.dataset;
	}

	get type(){
		return this._type;
	}

	get spec(){
		return this._dataobject?.spec ?? "";
	}

	get theme(){
		return this._dataobject?.theme ?? "";
	}

	get size(){
		return parseInt(this._dataobject?.size || '0');
	}

	get item(){
		return this._dataobject;
	}

	get itemName(){
		function stripExt(fileName: string){
			return fileName.slice(0, fileName.lastIndexOf('.'));
		}

		return this._dataobject ? stripExt(this._dataobject.fileName) : "";
	}

	get fileName() {
		return this.itemName;
	}

	get url(){
		return this._url;
	}

	get specLabel() {
		return this._dataobject?.specLabel ?? "";
	}

	get timeStart() {
		return new Date(this._dataobject?.timeStart ?? "");
	}

	get timeEnd() {
		return new Date(this._dataobject?.timeEnd ?? "");
	}

	get submTime(){
		return new Date(this._dataobject?.submTime ?? "");
	}

	get urlParams() {
		return this._keyValPairs;
	}

	getUrlSearchValue(key: string) {
		return this._keyValPairs[key];
	}

	withUrl(url: string){
		return new CartItem(this._id, this._dataobject, this._type, url);
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
		const host = new URL('/dygraph-light', document.baseURI).href;

		return `${host}/?` + Object.keys(newKeyVal)
			.map(key => `${key}=${encodeURIComponent(decodeURIComponent(newKeyVal[key]))}`)
			.join('&');
	}
}

export type CartProhibition = {
	allowCartAdd: boolean
	uiMessage?: string
}

export function addingToCartProhibition(dobj: KnownDataObject | undefined): CartProhibition {
	if(dobj === undefined) {
		return { allowCartAdd: false, uiMessage: "This data object has not yet been loaded" }
	}

	if(dobj.submTime.getTime() > Date.now()) {
		return { allowCartAdd: false, uiMessage: "This data object is under moratorium" }
	}

	if (dobj.level === 0 && dobj.theme === themeUris.atmospheric) {
		return { allowCartAdd: false, uiMessage: "Raw atmospheric data are only available on request at the moment" };
	}

	return { allowCartAdd: true };
}
