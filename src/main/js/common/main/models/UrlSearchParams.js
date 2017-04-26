export default class UrlSearchParams {
	constructor(search, required = [], optional = []) {
		this._search = window.decodeURIComponent(search);
		this._required = required;
		this._optional = optional;
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

	get optional(){
		return this._optional;
	}

	get isValidParams(){
		if (!this._required){
			return true;
		} else {
			return this._required.reduce((acc, curr) => acc * !!this.get(curr), true);
		}
	}

	get missingParams(){
		if (!this._required){
			return [];
		} else {
			return this._required.filter(p => !this.get(p))
		}
	}

	has(param){
		return window.URLSearchParams
			? this._params.has(param)
			: this._params.hasOwnProperty(param);
	}

	get(param){
		if (window.URLSearchParams) {
			return this._params.get(param) === 'null' ? null : this._params.get(param);
		} else {
			// Give null response for non existing params as URLSearchParams does
			return this._params.hasOwnProperty(param)
				? this._params[param] === 'null' ? null : this._params[param]
				: null;
		}
	}
}
