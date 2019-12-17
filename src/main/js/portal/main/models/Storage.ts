// Modelled after Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage

import {KeyAnyVal} from "../backend/declarations";
import {Int, isInt} from "../types";

export default class Storage{
	private state: KeyAnyVal = {};

	get length(){
		const t = this.key(2 as Int);
		return Object.keys(this.state).length;
	}

	key(n: Int){
		return isInt(n) && n >= 0 && n < Object.keys(this.state).length
			? Object.keys(this.state)[n]
			: null;
	}

	getItem(key: string){
		return key in this.state ? this.state[key] : null;
	}

	setItem(key: string, val: any){
		this.state[key] = val;
	}

	removeItem(key: string){
		delete this.state[key];
	}

	clear(){
		this.state = {};
	}
}
