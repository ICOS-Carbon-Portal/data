// Modelled after Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage

export default class Storage{
	constructor(){
		this.state = {};
	}

	get length(){
		return Object.keys(this.state).length;
	}

	key(n){
		return Number.isInteger(n) && n >= 0 && n < Object.keys(this.state).length
			? Object.keys(this.state)[n]
			: null;
	}

	getItem(key){
		return key in this.state ? this.state[key] : null;
	}

	setItem(key, val){
		this.state[key] = val;
	}

	removeItem(key){
		delete this.state[key];
	}

	clear(){
		this.state = {};
	}
}