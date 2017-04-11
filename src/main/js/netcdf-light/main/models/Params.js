import 'babel-polyfill';

export default class Params {
	constructor(search, required){
		this._params = new URLSearchParams(search);
		this.isValidParams = required.reduce((acc, curr) => acc * this._params.has(curr), true);
	}

	get(param){
		return this._params.has(param)
			? this._params.get(param) && this._params.get(param) !== 'null' ? this._params.get(param) : undefined
			: null;
	}
}
