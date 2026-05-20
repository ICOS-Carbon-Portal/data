// Modelled after Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage

import {type IdxSig} from "../backend/declarations";

export default class Storage {
	private state: IdxSig<any> = {};

	get length() {
		return Object.keys(this.state).length;
	}

	key(n: number) {
		return Number.isInteger(n) && n >= 0 && n < Object.keys(this.state).length
			? Object.keys(this.state)[n]
			: null;
	}

	getItem(key: string) {
		return key in this.state ? this.state[key] : null;
	}

	setItem(key: string, val: any) {
		this.state[key] = val;
	}

	removeItem(key: string) {
		delete this.state[key];
	}

	clear() {
		this.state = {};
	}
}
