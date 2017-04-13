export default class Params {
	constructor(search, required) {
		this._search = window.decodeURIComponent(search);
		this._required = required;
		this._params = this.parseSearch();
	}

	parseSearch() {
		if (window.URLSearchParams) {
			return new URLSearchParams(this._search);
		} else {
			const searchStr = this._search.replace(/^\?/, '');
			const keyValpairs = searchStr.split('&');

			return keyValpairs.reduce((acc, curr) => {
				const p = curr.split('=');
				acc[p[0]] = p[1];
				return acc;
			}, {});
		}
	}

	get search(){
		return this._search;
	}

	get required(){
		return this._required;
	}

	get isValidParams(){
		if (!this._required){
			return true;
		} else if (window.URLSearchParams) {
			return this._required.reduce((acc, curr) => acc * this._params.has(curr), true);
		} else {
			return this._required.reduce((acc, curr) => acc * this._params.hasOwnProperty(curr), true);
		}
	}

	has(param){
		return window.URLSearchParams
			? this._params.has(param)
			: this._params.hasOwnProperty(param);
	}

	get(param){
		if (window.URLSearchParams) {
			return this._params.get(param);
		} else {
			// Give null response for non existing params as URLSearchParams does
			return this._params.hasOwnProperty(param)
				? this._params[param]
				: null;
		}
	}
}
